// GET /fhir/launch — SMART on FHIR EHR launch entry point.
//
// EPIC redirects the clinician's browser here with:
//   ?iss=<FHIR base URL of the customer's EPIC>
//   &launch=<opaque launch context token>
//
// We discover the customer's SMART config, generate PKCE, remember per-launch
// state, then redirect the browser to EPIC's authorize endpoint. EPIC will
// bounce back to /fhir/callback.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const smart = require('../../services/fhir/smart');

router.get('/', async (req, res) => {
    const iss    = String(req.query.iss    || '').trim();
    const launch = String(req.query.launch || '').trim();

    if (!iss || !launch) {
        return res.status(400).send('Missing iss or launch parameter (SMART EHR launch only)');
    }

    const clientId    = process.env.EPIC_CLIENT_ID;
    const redirectUri = process.env.EPIC_REDIRECT_URI;
    if (!clientId || !redirectUri) {
        console.error('SMART launch attempted without EPIC_CLIENT_ID / EPIC_REDIRECT_URI configured');
        return res.status(500).send('Server is not configured for SMART launch');
    }

    try {
        const smartConfig = await smart.discoverSmartConfig(iss);
        const { codeVerifier, codeChallenge } = smart.createPkcePair();
        const state = smart.base64UrlEncode(crypto.randomBytes(16));

        await smart.rememberState(state, { iss, codeVerifier, launch, smartConfig });

        const authUrl = smart.buildAuthorizeUrl({
            smartConfig, clientId, redirectUri, state, codeChallenge, launch, iss,
        });

        res.redirect(authUrl);
    } catch (err) {
        console.error('SMART launch failed:', err?.message || err);
        res.status(502).send('SMART launch discovery failed. Check the iss URL is reachable.');
    }
});

module.exports = router;
