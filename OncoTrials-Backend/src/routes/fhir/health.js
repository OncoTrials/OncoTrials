// GET /fhir/health — SMART integration config check.
//
// One curl tells you whether the deployed revision is wired for an EPIC
// launch: which env vars are present, which client id is live (prefix only),
// and whether the dev sandbox override is on. No secrets are returned —
// booleans and non-secret URLs only.
//
//   curl https://<backend>/fhir/health
//
// Use this after every env change or deploy, BEFORE burning time in the EPIC
// portal: a stale EPIC_CLIENT_ID here means the authorize step will fail no
// matter what the portal says.

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // Optional shared-secret gate. Set FHIR_HEALTH_KEY in prod and pass it as
    // ?key=... or an X-Health-Key header; wrong/missing key gets a 404 so the
    // endpoint doesn't advertise itself. Left open when the env var is unset
    // (local dev). Even open, this returns booleans and non-secret URLs only —
    // the gate just removes the free config-reconnaissance surface.
    const requiredKey = process.env.FHIR_HEALTH_KEY;
    if (requiredKey && req.query.key !== requiredKey && req.headers['x-health-key'] !== requiredKey) {
        return res.status(404).end();
    }

    const clientId = process.env.EPIC_CLIENT_ID || null;

    res.json({
        service: 'oncotrials-fhir',
        checked_at: new Date().toISOString(),
        env: {
            EPIC_CLIENT_ID:               clientId ? `${clientId.slice(0, 8)}…` : null,
            EPIC_CLIENT_SECRET:           Boolean(process.env.EPIC_CLIENT_SECRET),
            EPIC_REDIRECT_URI:            process.env.EPIC_REDIRECT_URI || null,
            FRONTEND_LAUNCH_LANDING_URL:  process.env.FRONTEND_LAUNCH_LANDING_URL || null,
            SESSION_JWT_SECRET:           Boolean(process.env.SESSION_JWT_SECRET),
            PATIENT_HASH_PEPPER:          Boolean(process.env.PATIENT_HASH_PEPPER),
            UPSTASH_REDIS_REST_URL:       Boolean(process.env.UPSTASH_REDIS_REST_URL),
            OPENAI_API_KEY:               Boolean(process.env.OPENAI_API_KEY),
            DEV_SANDBOX_AGE_FALLBACK:     process.env.DEV_SANDBOX_AGE_FALLBACK === 'true',
        },
    });
});

module.exports = router;
