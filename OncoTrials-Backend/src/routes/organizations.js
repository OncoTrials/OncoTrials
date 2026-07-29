const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { checkDomain, findOrganizationForEmail, STATUS } = require('../services/domainVerification');
const { requireAuth } = require('../middleware/auth');

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

// GET /organizations/me — the authenticated user's verified organization.
// Resolved server-side from the JWT's email domain against valid_domains
// (the same source of truth registration's /check-domain uses), so the
// client-editable user_metadata.organization_id is never trusted. 404 when
// the email doesn't verifiably belong to any org — e.g. unknown-domain
// registrations pending manual review.
router.get('/me', requireAuth, async (req, res) => {
    if (req.user.source !== 'supabase_jwt' || !req.user.email) {
        return res.status(403).json({ error: 'Supabase authentication required' });
    }
    try {
        const org = await findOrganizationForEmail(req.user.email);
        if (!org) {
            return res.status(404).json({ error: 'No verified organization for this account' });
        }
        res.json({ id: org.id, name: org.name });
    } catch (err) {
        console.error('organizations/me failed:', err);
        res.status(500).json({ error: 'Failed to resolve organization' });
    }
});

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
