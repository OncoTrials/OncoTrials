const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { redis } = require('../db/redisClient');
const {
    LIST_COLUMNS,
    ALL_CHUNK_KEY_PREFIX,
    ALL_META_KEY,
    getCacheVersion,
    bumpCacheVersion,
    getAllTrialsCached,
    warmAllTrialsCache,
} = require('../services/trialsCache');

// Per-page list cache TTL: 24h. Same versioning scheme as the :all cache —
// when the importer bumps `trials:cache_version`, all `trials:v<n>:…` keys
// become orphaned and the next request misses → repopulates at the new
// version. Old entries die on their own via TTL; no scan/delete needed.
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const getCached = (key)       => redis.get(key);
const setCached = (key, data) => redis.set(key, data, { ex: CACHE_TTL_SECONDS });

// GET /trials?page=1&limit=20
//   • limit=all returns every trial in one response. The :all cache is
//     maintained by the importer (after each successful run) so user reads
//     never block on Supabase pagination — only the very first call after
//     a fresh deploy will trigger a lazy warm.
router.get('/', async (req, res) => {
    // Cache the response in the browser for 5 minutes, and in the CDN for 24 hours
    res.set('Cache-Control', 'public, max-age=300, s-maxage=86400');

    const wantAll = String(req.query.limit || '').toLowerCase() === 'all';
    const version = await getCacheVersion();

    // ---- limit=all path: served from the importer-maintained Redis cache ---
    if (wantAll) {
        const cached = await getAllTrialsCached();
        if (cached) return res.json(cached);

        // Cold cache — paginate now and warm it. After this, the next request
        // hits Redis directly. Subsequent imports will refresh atomically so
        // users never hit this path again under normal operation.
        try {
            console.log('[trials] :all cache cold — warming from Supabase');
            await warmAllTrialsCache();
            const fresh = await getAllTrialsCached();
            return res.json(fresh);
        } catch (err) {
            console.error('[trials] limit=all warm failed:', err?.message || err);
            return res.status(500).json({ error: err?.message || 'failed to fetch all trials' });
        }
    }

    // ---- paginated path (existing behavior) -------------------------------
    const limit = Math.min(parseInt(req.query.limit) || 20, 5000); // cap at 5000
    const page  = Math.max(parseInt(req.query.page)  || 1,  1);
    const offset = (page - 1) * limit;

    const cacheKey = `trials:v${version}:${page}:${limit}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    const { data, error, count } = await supabase
        .from('trials')
        .select(LIST_COLUMNS, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const payload = { data, total: count, page, limit };
    await setCached(cacheKey, payload);
    res.json(payload);
});

// GET /trials/stream — stream trials chunk-by-chunk as NDJSON.
// Each line is a JSON object: { chunk: <index>, data: [...], total: <number>, done: <boolean> }
// Frontend can begin rendering after the first chunk arrives.
router.get('/stream', async (req, res) => {
    try {
        const meta = await redis.get(ALL_META_KEY);
        if (!meta || typeof meta.chunkCount !== 'number') {
            // Cold cache — fall back to regular endpoint behavior
            console.log('[trials/stream] cache cold, warming...');
            await warmAllTrialsCache();
            const freshMeta = await redis.get(ALL_META_KEY);
            if (!freshMeta) {
                return res.status(500).json({ error: 'Failed to warm trial cache' });
            }
            return streamChunks(res, freshMeta);
        }
        return streamChunks(res, meta);
    } catch (err) {
        console.error('[trials/stream] error:', err);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Stream failed' });
        }
        res.end();
    }
});

// Streams the cached trials to the client as NDJSON ("newline-delimited JSON"):
// one JSON object per line, one line per Redis chunk. Writing line-by-line (and
// flushing after each) lets the browser start rendering the first batch of
// trials before the rest have been sent.
//
//   res       — the Express response we write the stream to.
//   cacheMeta — the cache summary read from Redis: how many chunks exist
//               (chunkCount) and how many trials in total (totalCount).
async function streamChunks(res, cacheMeta) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Total-Chunks', String(cacheMeta.chunkCount));
    res.setHeader('X-Total-Trials', String(cacheMeta.totalCount));

    for (let chunkIndex = 0; chunkIndex < cacheMeta.chunkCount; chunkIndex++) {
        // Each Redis key holds one batch (~500 trials) of the full list.
        const chunkTrials = await redis.get(`${ALL_CHUNK_KEY_PREFIX}${chunkIndex}`);
        const isFinalChunk = chunkIndex === cacheMeta.chunkCount - 1;

        const ndjsonLine = JSON.stringify({
            chunk: chunkIndex,
            data: chunkTrials || [],
            total: cacheMeta.totalCount,
            done: isFinalChunk,
        });
        res.write(ndjsonLine + '\n');

        // The global compression() middleware buffers writes inside its gzip
        // stream, so without an explicit flush the client would receive the
        // whole response in one burst at res.end() — defeating the point of
        // streaming. compression() adds res.flush() for exactly this; we guard
        // with a type check in case the middleware isn't present.
        if (typeof res.flush === 'function') res.flush();
    }
    res.end();
}

// Individual trial detail is also worth caching — most clicks open the same
// few trials per session. Short TTL is fine since the heavy hitter is the
// list endpoint above.
const DETAIL_CACHE_TTL_SECONDS = 6 * 60 * 60;  // 6h

// GET /trials/:id — full row for the detail page
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const version = await getCacheVersion();
    const cacheKey = `trial:v${version}:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(cached);

    const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return res.status(404).json({ error: error.message });
    await redis.set(cacheKey, data, { ex: DETAIL_CACHE_TTL_SECONDS });
    res.json(data);
});

// Columns a client is allowed to modify via PATCH /trials/:id. Deliberately
// excludes system/generated columns — id, nct_id, created_at, created_by,
// last_fetched_at — so a client can never overwrite identity/audit data just
// by including an unexpected key in the request body.
const UPDATABLE_TRIAL_COLUMNS = [
    'title', 'summary', 'status', 'sponsor',
    'eligibility_criteria', 'eligibility_criteria_summary',
    'biomarker_criteria', 'study_description',
    'source', 'organization',
    'sex', 'minimum_age', 'maximum_age', 'conditions',
    'location_city', 'location_state', 'location_country',
    'latitude', 'longitude', 'locations',
    'start_date', 'primary_completion_date', 'completion_date', 'closed_at',
];

// PATCH /trials/:id — partial update of an existing trial.
// Only whitelisted columns present in the request body are written; anything
// else in the body (including system columns, if a client sends them) is
// silently dropped rather than erroring, so the frontend can send a superset
// of fields (e.g. the full edit form) without this route needing to change
// every time a form field is added or removed.
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Request body must be an object of fields to update' });
    }

    const updateData = {};
    for (const key of UPDATABLE_TRIAL_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            updateData[key] = body[key];
        }
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
    }

    // `title` is non-nullable in the schema — block an update that would
    // clear it, same as the create-time validation below.
    if ('title' in updateData && (!updateData.title || typeof updateData.title !== 'string')) {
        return res.status(400).json({ error: 'Title cannot be empty' });
    }

    try {
        const { data, error } = await supabase
            .from('trials')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Trial not found' });
        }

        // Bust per-page + detail caches via version bump (same scheme as
        // POST below), then refresh the :all cache so the edit shows up
        // immediately on Browse All instead of waiting for the next import.
        await bumpCacheVersion('manual PATCH /trials/:id');
        try {
            await warmAllTrialsCache();
        } catch (err) {
            console.error('[trials] post-update :all cache refresh failed (continuing):', err?.message || err);
        }

        return res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /trials - create a new trial
router.post('/', async (req, res) => {
    const user = req.user;
    const { data: { supabaseUser } } = await supabase.auth.getUser()
    console.log('req body:', req.body);
    console.log('supabaseUser:', supabaseUser);

    const { metadata, eligibilityCriteria } = req.body;

    if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid metadata object in request body' });
    }

    if (!eligibilityCriteria || typeof eligibilityCriteria !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid eligibilityCriteria in request body' });
    }

    const {
        nct_id, title, summary, phase, condition, status, sponsor,
        location_city, location_state, location_country,
        latitude, longitude, biomarker_criteria, source = 'manual'
    } = metadata;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid title' });
    }

    const trialData = {
        nct_id, title, summary, phase, condition, status, sponsor,
        eligibility_criteria: eligibilityCriteria,
        location_city, location_state, location_country,
        latitude, longitude, biomarker_criteria, source,
    };

    try {
        const { data, error } = await supabase
            .from('trials')
            .insert([trialData])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Bust per-page caches via version bump, then refresh the :all cache
        // so the new trial shows up immediately on Browse All.
        await bumpCacheVersion('manual POST /trials');
        try {
            await warmAllTrialsCache();
        } catch (err) {
            console.error('[trials] post-insert :all cache refresh failed (continuing):', err?.message || err);
        }

        return res.status(201).json(data[0]);
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;