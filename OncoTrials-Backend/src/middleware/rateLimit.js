// Sliding-window rate limiter backed by our shared Redis (Upstash in prod,
// in-memory in dev). Split into two middlewares:
//
//   ipRateLimit      — runs BEFORE auth. Protects the auth path itself
//                      (each auth attempt costs a Supabase getUser call).
//   subjectRateLimit — runs AFTER auth, keyed on req.user.id. Previously this
//                      ran pre-auth where req.user was never set, so the
//                      per-subject limit silently collapsed into the IP limit.
//
// Why not express-rate-limit + rate-limit-redis? The latter expects a
// node-redis-shaped client. Our Upstash client has a different shape; rather
// than adding an adapter we wrote ~40 lines to do the job — easier to audit
// and matches the rest of the codebase.
//
// Limits (per minute window):
//   - per IP:     120 req/min
//   - per sub:     60 req/min
//
// 429 response includes `Retry-After: <seconds>`.

const { redis } = require('../db/redisClient');

const WINDOW_SECONDS  = 60;
const IP_LIMIT        = 120;
const SUBJECT_LIMIT   = 60;

function currentWindowBucket() {
    // Bucket per WINDOW_SECONDS — moves every minute. Keys auto-expire.
    return Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
}

// Client IP for rate-limiting. X-Forwarded-For is client-supplied except for
// the entry the platform's proxy appends — on Cloud Run, Google's front end
// appends the real client IP as the LAST entry. Taking the first entry (the
// old behavior) let callers spoof a fresh "IP" per request and bypass the
// limit entirely.
function clientIp(req) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (xff.length > 0) return xff[xff.length - 1];
    return req.socket?.remoteAddress || 'unknown';
}

async function incrAndCheck(key, limit) {
    const next = await redis.incrBy(key, 1);
    if (Number(next) === 1) await redis.expire(key, WINDOW_SECONDS * 2);
    return { count: Number(next), allowed: Number(next) <= limit };
}

function setLimitHeaders(res, bucket, limit, count) {
    res.setHeader('X-RateLimit-Limit',     String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    res.setHeader('X-RateLimit-Reset',     String((bucket + 1) * WINDOW_SECONDS));
}

function reject429(res, bucket) {
    const retryAfter = ((bucket + 1) * WINDOW_SECONDS) - Math.floor(Date.now() / 1000);
    res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
    return res.status(429).json({ error: 'Too many requests' });
}

async function ipRateLimit(req, res, next) {
    const bucket = currentWindowBucket();
    try {
        const result = await incrAndCheck(`rl:ip:${clientIp(req)}:${bucket}`, IP_LIMIT);
        setLimitHeaders(res, bucket, IP_LIMIT, result.count);
        if (!result.allowed) return reject429(res, bucket);
        next();
    } catch (err) {
        // Never block traffic on a rate-limiter Redis failure — log and pass.
        console.error('ipRateLimit lookup failed (allowing request):', err);
        next();
    }
}

async function subjectRateLimit(req, res, next) {
    const bucket = currentWindowBucket();
    const sub = req.user?.id || clientIp(req);   // auth guarantees user; IP fallback just in case
    try {
        const result = await incrAndCheck(`rl:sub:${sub}:${bucket}`, SUBJECT_LIMIT);
        setLimitHeaders(res, bucket, SUBJECT_LIMIT, result.count);
        if (!result.allowed) return reject429(res, bucket);
        next();
    } catch (err) {
        console.error('subjectRateLimit lookup failed (allowing request):', err);
        next();
    }
}

module.exports = { ipRateLimit, subjectRateLimit };
