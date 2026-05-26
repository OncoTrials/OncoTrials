// SMART on FHIR EHR-launch helpers.
//
// Handles:
//   1. Discovering the SMART configuration at `${iss}/.well-known/smart-configuration`
//   2. Building the authorization URL (PKCE)
//   3. Exchanging the authorization code for an access token
//   4. Building the FHIR base URL the token is scoped to
//
// The launch flow lives in routes/fhir/launch.js and routes/fhir/callback.js
// — this module is the side-effect-free helpers they call.
//
// Spec references:
//   - http://hl7.org/fhir/smart-app-launch/app-launch.html
//   - https://fhir.epic.com/Documentation?docId=oauth2&section=BackendOAuth2Guide
//     (Epic-specific notes)

const crypto = require('crypto');
const axios  = require('axios');
const { redis } = require('../../db/redisClient');

// `offline_access` is deliberately not requested — we never use a refresh token.
// The flow is one-shot: token issued → patient bundle fetched in /fhir/callback
// → token discarded. Avoiding offline_access also means EPIC's "Requires
// Persistent Access" checkbox stays off, which keeps the security posture
// simpler (no long-lived credentials in flight).
const REQUIRED_SCOPES = [
    'launch',
    'openid',
    'fhirUser',
    'patient/Patient.read',
    'patient/Condition.read',
    'patient/Observation.read',
    'patient/MedicationRequest.read',
    'patient/Procedure.read',
].join(' ');

// State cache lives in Redis (Upstash in prod, in-memory in dev) so the launch
// and callback can land on different Cloud Run containers.
//
// TTL = 30 min. SMART Health IT's sandbox UI (and Epic's real auth screen) can
// take a while if the user has to log in as a practitioner, browse a long
// patient list, and pick one. 10 min was tight under exploratory testing.
const STATE_TTL_SECONDS = 30 * 60;
const stateKey = (state) => `smart:state:${state}`;

async function rememberState(state, payload) {
    await redis.set(stateKey(state), payload, { ex: STATE_TTL_SECONDS });
    // Diagnostic: log so we can correlate launch with the eventual callback.
    // Logs the *key*, never the verifier or the launch token.
    console.log(`[smart] rememberState key=${stateKey(state)} ttl=${STATE_TTL_SECONDS}s`);
}

async function consumeState(state) {
    const key = stateKey(state);
    const v = await redis.get(key);
    if (!v) {
        console.warn(`[smart] consumeState MISS key=${key} (already consumed, expired, or never stored)`);
        return null;
    }
    // One-shot: delete so an authorize-code replay can't reuse the verifier.
    await redis.del(key);
    console.log(`[smart] consumeState HIT key=${key}`);
    return v;
}

// PKCE: code_verifier is a high-entropy random string, code_challenge is its
// base64url SHA-256.
function createPkcePair() {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
        crypto.createHash('sha256').update(codeVerifier).digest()
    );
    return { codeVerifier, codeChallenge };
}

function base64UrlEncode(buf) {
    return buf.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function discoverSmartConfig(iss) {
    // The well-known endpoint returns the auth + token URLs and supported
    // capabilities. Epic publishes this for every customer's FHIR base URL.
    const url = `${iss.replace(/\/+$/, '')}/.well-known/smart-configuration`;
    const { data } = await axios.get(url, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
    });
    if (!data?.authorization_endpoint || !data?.token_endpoint) {
        throw new Error(`SMART discovery at ${url} did not return required endpoints`);
    }
    return data;
}

function buildAuthorizeUrl({ smartConfig, clientId, redirectUri, state, codeChallenge, launch, iss }) {
    const params = new URLSearchParams({
        response_type:         'code',
        client_id:             clientId,
        redirect_uri:          redirectUri,
        scope:                 REQUIRED_SCOPES,
        state,
        aud:                   iss,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
        launch,
    });
    return `${smartConfig.authorization_endpoint}?${params.toString()}`;
}

async function exchangeCodeForToken({ smartConfig, clientId, clientSecret, redirectUri, code, codeVerifier }) {
    const body = new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        code_verifier: codeVerifier,
    });

    // Confidential clients (we have a backend, so we are confidential) send
    // the client secret via HTTP Basic per the SMART spec.
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (clientSecret) {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers.Authorization = `Basic ${basic}`;
    }

    const { data } = await axios.post(smartConfig.token_endpoint, body.toString(), {
        timeout: 8000,
        headers,
    });

    if (!data?.access_token) {
        throw new Error('Token endpoint did not return an access_token');
    }
    return {
        accessToken:  data.access_token,
        tokenType:    data.token_type || 'Bearer',
        expiresIn:    data.expires_in || 3600,
        scope:        data.scope || REQUIRED_SCOPES,
        patientId:    data.patient || null,
        idToken:      data.id_token || null,
        refreshToken: data.refresh_token || null,
    };
}

module.exports = {
    REQUIRED_SCOPES,
    rememberState,
    consumeState,
    createPkcePair,
    discoverSmartConfig,
    buildAuthorizeUrl,
    exchangeCodeForToken,
    base64UrlEncode,
};
