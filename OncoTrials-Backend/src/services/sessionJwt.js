// Mints + verifies the short-lived OncoTrials session JWT that the FHIR
// callback hands back to the browser. The browser includes it as a Bearer
// token when calling /api/v1/match — it's the SMART-launch equivalent of a
// logged-in user.
//
// Lifetime: 5 minutes. The clinician kicks off a match request immediately
// after launch; we don't need a long session.
//
// Claims:
//   sub  — FHIR Patient id  (NOT a clinical identifier; opaque to the LLM)
//   iss  — 'oncotrials'
//   src  — 'smart_launch'
//   org  — internal org id (if we've mapped the EPIC iss to one of our orgs)
//   exp/iat — standard
//
// We use `jose` (already a backend dep) so this works in both Node and edge
// runtimes if we ever move to one.

const { SignJWT, jwtVerify } = require('jose');

const ALG = 'HS256';
const ISSUER = 'oncotrials';
const DEFAULT_TTL_SECONDS = 5 * 60;

function getSecret() {
    const raw = process.env.SESSION_JWT_SECRET;
    if (!raw || raw.length < 32) {
        throw new Error('SESSION_JWT_SECRET must be set to a 32+ char value');
    }
    return new TextEncoder().encode(raw);
}

async function mint({ patientId, orgId = null, requestId = null, ttlSeconds = DEFAULT_TTL_SECONDS }) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ src: 'smart_launch', org: orgId, rid: requestId })
        .setProtectedHeader({ alg: ALG })
        .setSubject(String(patientId))
        .setIssuer(ISSUER)
        .setIssuedAt(now)
        .setExpirationTime(now + ttlSeconds)
        .sign(getSecret());
}

async function verify(token) {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    return payload;
}

module.exports = { mint, verify, DEFAULT_TTL_SECONDS };
