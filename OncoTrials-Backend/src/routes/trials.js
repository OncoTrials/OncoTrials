const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { redis } = require('../db/redisClient');
const {
    LIST_COLUMNS,
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
