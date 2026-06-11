// Shared Upstash Redis client + in-memory fallback.
//
// Returns:
//   { redis, isShared }
//     redis     — a thin object with .get/.set/.incr/.expire/.del that works
//                 against Upstash when env vars are present, or an in-process
//                 Map otherwise (local dev only).
//     isShared  — true when the cache is actually shared across containers.
//
// The fallback is deliberately tiny — it supports the small surface area the
// rest of the backend uses, not the full Redis command set. If you need a
// command that isn't here, prefer adding it both in the Upstash branch and
// the Map branch rather than reaching for `redis` directly.

let upstash = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    upstash = new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

// ---- In-memory fallback (process-local) ---------------------------------

const mem = new Map();   // key → { value, expiresAt|null }

function memGet(key) {
    const entry = mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt != null && Date.now() > entry.expiresAt) {
        mem.delete(key);
        return null;
    }
    return entry.value;
}

function memSet(key, value, ttlSeconds = null) {
    mem.set(key, {
        value,
        expiresAt: ttlSeconds != null ? Date.now() + ttlSeconds * 1000 : null,
    });
}

function memIncrBy(key, amount) {
    const current = Number(memGet(key) ?? 0);
    const next = current + amount;
    // Preserve existing expiry; if none, no TTL.
    const existing = mem.get(key);
    const expiresAt = existing?.expiresAt ?? null;
    mem.set(key, { value: next, expiresAt });
    return next;
}

function memExpire(key, ttlSeconds) {
    const entry = mem.get(key);
    if (!entry) return false;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
}

function memDel(key) { mem.delete(key); }

// ---- Unified facade -----------------------------------------------------

const redis = upstash
    ? {
        async get(key) {
            // Upstash auto-JSON-deserializes when the stored value was a
            // string-encoded object via .set(). Pass through.
            return upstash.get(key);
        },
        async set(key, value, opts = {}) {
            // opts: { ex: seconds }
            if (opts.ex != null) {
                return upstash.set(key, value, { ex: opts.ex });
            }
            return upstash.set(key, value);
        },
        async incrBy(key, amount) {
            return upstash.incrby(key, amount);
        },
        async incrByFloat(key, amount) {
            return upstash.incrbyfloat(key, amount);
        },
        async expire(key, ttlSeconds) {
            return upstash.expire(key, ttlSeconds);
        },
        async del(key) {
            return upstash.del(key);
        },
    }
    : {
        async get(key) { return memGet(key); },
        async set(key, value, opts = {}) {
            memSet(key, value, opts.ex ?? null);
            return 'OK';
        },
        async incrBy(key, amount) { return memIncrBy(key, amount); },
        async incrByFloat(key, amount) { return memIncrBy(key, amount); },
        async expire(key, ttlSeconds) { return memExpire(key, ttlSeconds); },
        async del(key) { memDel(key); return 1; },
    };

const isShared = !!upstash;

if (isShared) {
    console.log('Redis: using Upstash (shared across containers)');
} else {
    console.log('Redis: using in-memory fallback (set UPSTASH_REDIS_REST_URL/TOKEN for shared cache)');
}

module.exports = { redis, isShared };
