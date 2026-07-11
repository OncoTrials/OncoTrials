const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { redis } = require('../db/redisClient');
const { requireAuth } = require('../middleware/auth');
const { findOrgForEmail } = require('../services/domainVerification');
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
    // 5 minutes in both browser and CDN. The Redis cache-version scheme
    // invalidates instantly on import, but a CDN can't see version bumps —
    // a long s-maxage would pin stale data for up to a day after an import.
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');

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
        let chunkTrials = await redis.get(`${ALL_CHUNK_KEY_PREFIX}${chunkIndex}`);

        // A missing chunk means the cache was evicted or shrunk mid-stream.
        // Silently emitting an empty batch would serve the client a truncated
        // trial list; instead re-warm once and retry, and if the chunk still
        // isn't there, tell the client the stream is incomplete so it can
        // fall back to the non-streaming endpoint.
        if (chunkTrials == null) {
            console.warn(`[trials/stream] chunk ${chunkIndex} missing; re-warming cache`);
            try {
                await warmAllTrialsCache();
                chunkTrials = await redis.get(`${ALL_CHUNK_KEY_PREFIX}${chunkIndex}`);
            } catch (err) {
                console.error('[trials/stream] re-warm failed:', err?.message || err);
            }
            if (chunkTrials == null) {
                res.write(JSON.stringify({ chunk: chunkIndex, data: [], total: cacheMeta.totalCount, done: true, error: 'stream_incomplete' }) + '\n');
                break;
            }
        }

        const isFinalChunk = chunkIndex === cacheMeta.chunkCount - 1;

        const ndjsonLine = JSON.stringify({
            chunk: chunkIndex,
            data: chunkTrials,
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

    if (error) {
        // PGRST116 = no rows for .single(); anything else is a server-side
        // failure and must not masquerade as "trial not found".
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Trial not found' });
        console.error(`[trials/:id] fetch failed for ${id}:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch trial' });
    }
    await redis.set(cacheKey, data, { ex: DETAIL_CACHE_TTL_SECONDS });
    res.json(data);
});

// Roles allowed to create trials. Role comes from public.users (server-side
// row, not the client-editable user_metadata).
const TRIAL_WRITER_ROLES = ['practitioner', 'crc'];

// POST /trials - create a new trial.
//
// Auth: Supabase JWT, role practitioner/crc only. The trial is stamped with
// the org the creator belongs to — derived server-side from their email
// domain against organizations.valid_domains — so clinical staff can only
// ever write trials under their own organization.
router.post('/', requireAuth, async (req, res) => {
    if (req.user.source !== 'supabase_jwt') {
        return res.status(403).json({ error: 'Trial creation requires a signed-in physician or CRC account' });
    }

    // Role + canonical email from our own users table.
    const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', req.user.id)
        .single();
    if (userErr || !userRow) {
        console.error('[trials] user lookup failed:', userErr?.message);
        return res.status(403).json({ error: 'Account not recognized' });
    }
    if (!TRIAL_WRITER_ROLES.includes(userRow.role)) {
        return res.status(403).json({ error: 'Only physicians and CRCs can create trials' });
    }

    let org;
    try {
        org = await findOrgForEmail(userRow.email || req.user.email);
    } catch (err) {
        console.error('[trials] org resolution failed:', err?.message || err);
        return res.status(500).json({ error: 'Could not verify organization membership' });
    }
    if (!org) {
        return res.status(403).json({
            error: 'Your account email domain is not associated with a verified organization. Contact support to register your organization.',
        });
    }

    const { metadata, eligibilityCriteria } = req.body ?? {};

    if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid metadata object in request body' });
    }

    if (typeof eligibilityCriteria !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid eligibilityCriteria in request body' });
    }

    const {
        nct_id, title, summary, status, sponsor,
        organization, study_description, conditions, sex, minimum_age, maximum_age,
        location_city, location_state, location_country,
        latitude, longitude, biomarker_criteria,
        start_date, primary_completion_date, completion_date, closed_at,
        source = 'manual'
    } = metadata;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid title' });
    }

    const trialData = {
        nct_id, title, summary, status, sponsor,
        organization, study_description, conditions, sex, minimum_age, maximum_age,
        eligibility_criteria: eligibilityCriteria,
        location_city, location_state, location_country,
        latitude, longitude, biomarker_criteria,
        start_date, primary_completion_date, completion_date, closed_at,
        source,
        created_by: req.user.id,
        org_id: org.id,     // server-derived; callers cannot choose an org
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
