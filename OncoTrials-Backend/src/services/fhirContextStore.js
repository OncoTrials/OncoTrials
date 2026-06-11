// Short-lived store for the normalized patient that was fetched during the
// SMART callback. The frontend then calls POST /api/v1/match with the session
// JWT as its only auth — match.js looks up the normalized patient here using
// the JWT's request-id claim so the bundle never has to travel through the
// browser.
//
// Storage: Redis (Upstash) with a 10-minute TTL. Falls back to in-memory in
// dev (single container). Key = `fhirctx:{requestId}`. Value = the internal
// Patient object — already de-identified by patientNormalizer.

const { redis } = require('../db/redisClient');

const TTL_SECONDS = 10 * 60;   // 10 min — long enough for the user to be redirected and the match call to land

function key(requestId) { return `fhirctx:${requestId}`; }

async function put(requestId, patient) {
    await redis.set(key(requestId), patient, { ex: TTL_SECONDS });
}

async function take(requestId) {
    const k = key(requestId);
    const value = await redis.get(k);
    if (value != null) {
        // One-shot — delete after first read so a leaked JWT can't be replayed
        // to fetch the patient again from a different IP.
        await redis.del(k);
    }
    return value;
}

module.exports = { put, take, TTL_SECONDS };
