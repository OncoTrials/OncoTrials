const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { checkDomain, STATUS } = require('../services/domainVerification');

// GET /organizations — list orgs for the register-page picker.
// Returns only id/name/aliases; valid_domains and excluded_domains are
// intentionally withheld so the browser can't see them.
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name, aliases')
        .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/organization-name', async (req, res) => {
    const {organizationId} = req.body ?? {};
    if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
    }
    try {
        const { data: organizationName, error } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single();
        res.json(organizationName)
    } catch (error) {
        res.status(500).json({error})
    }
})

// POST /organizations/check-domain — validate an email against an org's
// domain lists. Returns only the verdict so the domain arrays never leak.
router.post('/check-domain', async (req, res) => {
    const { organizationId, email } = req.body ?? {};
    if (!organizationId || !email) {
        return res.status(400).json({ error: 'organizationId and email are required' });
    }
    try {
        const status = await checkDomain(organizationId, email);
        res.json({ status });
    } catch (err) {
        // Treat a missing org as a client error; everything else is a server error.
        if (err?.code === 'PGRST116') {
            return res.status(404).json({ error: 'Organization not found' });
        }
        console.error('check-domain failed:', err);
        res.status(500).json({ error: 'Domain check failed' });
    }
});

module.exports = router;
module.exports.STATUS = STATUS;
