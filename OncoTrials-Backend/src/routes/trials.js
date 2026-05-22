const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');

// Columns returned for list views — heavy text fields are excluded to reduce egress
const LIST_COLUMNS = [
    'id', 'nct_id', 'title', 'status', 'sponsor',
    'summary', 'conditions', 'sex', 'minimum_age', 'maximum_age',
    'location_city', 'location_state', 'location_country',
    'latitude', 'longitude', 'start_date', 'primary_completion_date',
    'completion_date', 'eligibility_criteria_summary', 'biomarker_criteria', 'created_at'
].join(', ');

// Simple in-memory cache with TTL — avoids re-querying Supabase on every page load
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data;
}

function setCached(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// GET /trials?page=1&limit=20
router.get('/', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 5000); // cap at 5000
    const page  = Math.max(parseInt(req.query.page)  || 1,  1);
    const offset = (page - 1) * limit;

    const cacheKey = `trials:${page}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { data, error, count } = await supabase
        .from('trials')
        .select(LIST_COLUMNS, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const payload = { data, total: count, page, limit };
    setCached(cacheKey, payload);
    res.json(payload);
});

// GET /trials/:id — full row for the detail page
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return res.status(404).json({ error: error.message });
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

        return res.status(201).json(data[0]);
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
