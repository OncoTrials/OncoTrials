// GET /fhir/callback — SMART on FHIR OAuth callback.
//
// EPIC (or the SMART Health IT sandbox) redirects the user's browser here
// after they authorize, with `?code=...&state=...`.
//
// This file does six steps. Each is a named helper below — read the route
// handler at the bottom as the table of contents.
//
//   1. validateQueryParams         — reject malformed requests early
//   2. loadEnvOrFail               — confirm Cloud Run is configured
//   3. recoverLaunchContext        — match `state` back to what /fhir/launch stored
//   4. exchangeCodeAndFetchPatient — get a FHIR access token, pull the patient bundle
//   5. stashPatientForFrontend     — hand the de-identified Patient off via Redis + JWT
//   6. redirectToFrontend          — bounce the browser to the landing page

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const smart             = require('../../services/fhir/smart');
const fhirClient        = require('../../services/fhir/fhirClient');
const patientNormalizer = require('../../services/patientNormalizer');
const fhirContextStore  = require('../../services/fhirContextStore');
const sessionJwt        = require('../../services/sessionJwt');

// -------------------------------------------------------------------------
// Step helpers
// -------------------------------------------------------------------------

// 1. Pull `code` and `state` out of the query string and reject if missing.
function validateQueryParams(req) {
    const code  = String(req.query.code  || '').trim();
    const state = String(req.query.state || '').trim();
    if (!code || !state) return { error: 'Missing code or state' };
    return { code, state };
}

// 2. Read configuration from env. Bail with a clear server-side log if any
//    required value is missing — common mistake during first deploys.
function loadEnvOrFail() {
    const clientId     = process.env.EPIC_CLIENT_ID;
    const clientSecret = process.env.EPIC_CLIENT_SECRET || null;     // optional for public clients
    const redirectUri  = process.env.EPIC_REDIRECT_URI;
    const frontendUrl  = process.env.FRONTEND_LAUNCH_LANDING_URL;

    const missing = [];
    if (!clientId)    missing.push('EPIC_CLIENT_ID');
    if (!redirectUri) missing.push('EPIC_REDIRECT_URI');
    if (!frontendUrl) missing.push('FRONTEND_LAUNCH_LANDING_URL');

    if (missing.length > 0) {
        return { error: `Server is not configured for SMART callback (missing: ${missing.join(', ')})` };
    }
    return { clientId, clientSecret, redirectUri, frontendUrl };
}

// 3. Look up the launch context the /fhir/launch handler stashed for this
//    state. If we don't find it, the state is unknown, expired (TTL passed),
//    or already consumed by an earlier callback for the same flow.
async function recoverLaunchContext(state) {
    const remembered = await smart.consumeState(state);
    if (!remembered) {
        return { error: 'Unknown or expired state. Re-launch from the EHR.' };
    }
    return { remembered };
}

// 4. Trade the OAuth `code` for a FHIR access token, then immediately pull
//    the patient's Patient/Condition/Observation/MedicationRequest/Procedure
//    bundle and normalize it down to our internal de-identified Patient.
//    The FHIR access token never leaves this function — we discard it after
//    the bundle is in memory.
//
//    Production policy: deceased patients are NOT matched. Returns a 422-style
//    error response that the route handler will surface as a clear message.
//    A clinician launching for a deceased patient should see "not applicable"
//    immediately, not a ranked trial list.
//
//    Sandbox/dev override: set DEV_SANDBOX_AGE_FALLBACK=true to allow deceased
//    patients to flow through anyway, using deceasedDateTime → most-recent-
//    clinical-event → today as the age reference. This exists ONLY so that
//    SMART Health IT's Synthea sandbox (where most patients are decades-old
//    synthetic records) can be used end-to-end during development. Do not set
//    it in production. The behaviour is intentionally inert when the env var
//    is unset.
async function exchangeCodeAndFetchPatient({ remembered, env, code }) {
    const token = await smart.exchangeCodeForToken({
        smartConfig:  remembered.smartConfig,
        clientId:     env.clientId,
        clientSecret: env.clientSecret,
        redirectUri:  env.redirectUri,
        code,
        codeVerifier: remembered.codeVerifier,
    });

    if (!token.patientId) {
        return { error: 'Authorization succeeded but no patient context was returned by the EHR' };
    }

    const bundle = await fhirClient.fetchPatientBundle(remembered.iss, token.accessToken, token.patientId);

    // Production policy: deceased patients are not eligible for trial matching.
    // Reject before we waste an LLM call (and before we produce a misleading
    // ranked list for a patient who can't enroll in anything).
    const isDeceased = bundle.patient?.deceasedBoolean === true || !!bundle.patient?.deceasedDateTime;
    const devSandboxOverride = process.env.DEV_SANDBOX_AGE_FALLBACK === 'true';

    if (isDeceased && !devSandboxOverride) {
        console.warn(`[fhir/callback] rejecting deceased patient ${token.patientId} (set DEV_SANDBOX_AGE_FALLBACK=true to allow in dev only)`);
        return {
            error: 'This patient is recorded as deceased. Trial matching is not applicable.',
            status: 422,
        };
    }

    // Compute the age reference date.
    //   - Production (default): null → ageFromBirthDate uses today.
    //   - Dev sandbox override: prefer deceasedDateTime; fall back to the most
    //     recent clinical event across the bundle. This narrow code path makes
    //     SMART Health IT's stale Synthea patients usable in testing without
    //     leaking sandbox assumptions into the production path.
    let ageReferenceDate = null;
    if (devSandboxOverride) {
        ageReferenceDate = bundle.patient?.deceasedDateTime || mostRecentClinicalEventDate(bundle) || null;
    }

    const patient = patientNormalizer.normalize(bundle, { ageReferenceDate });

    // If we couldn't find a cancer diagnosis, log what conditions *were*
    // present so the operator can see whether (a) the patient genuinely has
    // no oncology problem, or (b) our cancer regex is missing a code/term.
    // Logged values are clinical taxonomy (codes + display strings), not PHI.
    if (!patient.cancerType) {
        const summary = (bundle.conditions || []).slice(0, 30).map((c) => ({
            text:     c.code?.text || null,
            display:  c.code?.coding?.[0]?.display || null,
            code:     c.code?.coding?.[0]?.code || null,
            system:   c.code?.coding?.[0]?.system || null,
            category: c.category?.[0]?.coding?.[0]?.code || null,
        }));
        console.warn(
            `[fhir/callback] no cancer condition matched for patient ${token.patientId} ` +
            `(conditions seen: ${bundle.conditions?.length ?? 0}). Sample:`,
            JSON.stringify(summary)
        );
    }

    return { patient, fhirPatientId: token.patientId };
}

// Dev-only helper used when DEV_SANDBOX_AGE_FALLBACK=true. Picks the most
// recent date across the patient's bundle so age can be computed as "of last
// clinical contact" — only meaningful for stale sandbox patients with no
// current events. Never invoked in production.
function mostRecentClinicalEventDate(bundle) {
    const dates = [];
    const push = (d) => { if (d) dates.push(d); };
    for (const c of bundle.conditions          || []) { push(c.recordedDate); push(c.onsetDateTime); }
    for (const o of bundle.observations        || []) { push(o.effectiveDateTime); push(o.issued); }
    for (const m of bundle.medicationRequests  || []) { push(m.authoredOn); }
    for (const p of bundle.procedures          || []) { push(p.performedDateTime); push(p.performedPeriod?.end); }
    if (dates.length === 0) return null;
    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return dates[0];
}

// 5. Park the normalized Patient in our short-lived Redis store under a fresh
//    request id, then mint a 5-min session JWT carrying that id. The browser
//    will present the JWT to POST /api/v1/match, which one-shot-reads the
//    Patient from the store using the JWT's `rid` claim.
async function stashPatientForFrontend({ patient, fhirPatientId }) {
    const requestId = crypto.randomUUID();
    await fhirContextStore.put(requestId, patient);
    const jwt = await sessionJwt.mint({
        patientId: fhirPatientId,
        orgId:     null,                  // org resolution from `iss` is a follow-up
        requestId,
    });
    return { requestId, jwt };
}

// 6. Build the redirect target. The JWT goes in the URL fragment (after `#`)
//    so it never appears in server-side access logs, only the browser sees it.
function redirectToFrontend(res, { frontendUrl, jwt, requestId }) {
    const url = new URL(frontendUrl);
    url.hash = new URLSearchParams({ token: jwt, rid: requestId }).toString();
    res.redirect(url.toString());
}

// -------------------------------------------------------------------------
// Route handler
// -------------------------------------------------------------------------

router.get('/', async (req, res) => {
    // 1. Validate
    const { code, state, error: paramErr } = validateQueryParams(req);
    if (paramErr) return res.status(400).send(paramErr);

    // 2. Load config
    const env = loadEnvOrFail();
    if (env.error) {
        console.error('[fhir/callback]', env.error);
        return res.status(500).send(env.error);
    }

    // 3. Recover launch context
    const { remembered, error: stateErr } = await recoverLaunchContext(state);
    if (stateErr) return res.status(400).send(stateErr);

    try {
        // 4. Exchange code, fetch patient
        const { patient, fhirPatientId, error: fhirErr, status: fhirStatus } =
            await exchangeCodeAndFetchPatient({ remembered, env, code });
        if (fhirErr) return res.status(fhirStatus || 400).send(fhirErr);

        // 5. Stash for the frontend
        const { requestId, jwt } = await stashPatientForFrontend({ patient, fhirPatientId });

        // 6. Bounce the browser
        return redirectToFrontend(res, { frontendUrl: env.frontendUrl, jwt, requestId });
    } catch (err) {
        // Surface upstream errors verbatim in the server log; keep the user-
        // facing response generic so we don't leak token-endpoint internals.
        console.error('[fhir/callback] failed:', err?.response?.data || err?.message || err);
        return res.status(502).send('SMART callback failed. See server logs for details.');
    }
});

module.exports = router;
