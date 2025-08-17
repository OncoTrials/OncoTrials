const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
// const verifyUser = require('../middleware/verifyUser');

// GET /trials - list all trials
router.get('/', async (req, res) =>{
    const { data, error } = await supabase.from('trials').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /trials/:id - get trial by ID
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

    // Optionally restrict to CRC role
    // if (user.role !== 'CRC') {
    //     return res.status(403).json({ error: 'Forbidden: Only CRCs can create trials' });
    // }

    // if (!user?.sub) {
    //     return res.status(400).json({ error: 'Invalid user token: missing sub' });
    // }

    const { metadata, eligibilityCriteria } = req.body;

    if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid metadata object in request body' });
    }

    if (!eligibilityCriteria || typeof eligibilityCriteria !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid eligibilityCriteria in request body' });
    }

    // Extract relevant fields
    const {
        nct_id,
        title,
        summary,
        phase,
        condition,
        status,
        sponsor,
        location_city,
        location_state,
        location_country,
        latitude,
        longitude,
        biomarker_criteria,
        source = 'manual'
    } = metadata;

    // Required fields
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid title' });
    }

    const trialData = {
        nct_id,
        title,
        summary,
        phase,
        condition,
        status,
        sponsor,
        eligibility_criteria: eligibilityCriteria,
        location_city,
        location_state,
        location_country,
        latitude,
        longitude,
        biomarker_criteria,
        source,
    };

    console.log('trialData payload:', trialData);


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