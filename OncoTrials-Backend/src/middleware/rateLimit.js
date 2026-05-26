// Sliding-window rate limiter backed by our shared Redis (Upstash in prod,
// in-memory in dev). Per-IP and per-authenticated-subject limits.
//
// Why not express-rate-limit + rate-limit-redis? The latter expects a
// node-redis-shaped client. Our Upstash client has a different shape; rather
// than adding an adapter we wrote ~40 lines to do the job — easier to audit
// and matches the rest of the codebase.
//
// Limits (per minute window):
//   - per IP:     120 req/min
//   - per sub:     60 req/min   (sub = req.user.id when set, else IP)
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

async function incrAndCheck(key, limit) {
    const next = await redis.incrBy(key, 1);
    if (next === 1) await redis.expire(key, WINDOW_SECONDS * 2);
    return { count: Number(next), allowed: Number(next) <= limit };
}

async function matchRateLimit(req, res, next) {
    const bucket = currentWindowBucket();
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const sub = req.user?.id || ip;   // pre-auth requests fall back to IP

    try {
        const [ipResult, subResult] = await Promise.all([
            incrAndCheck(`rl:ip:${ip}:${bucket}`,   IP_LIMIT),
            incrAndCheck(`rl:sub:${sub}:${bucket}`, SUBJECT_LIMIT),
        ]);

        const allowed = ipResult.allowed && subResult.allowed;
        // Always report the *tighter* limit headers so callers can self-throttle.
        const remaining = Math.max(0, Math.min(IP_LIMIT - ipResult.count, SUBJECT_LIMIT - subResult.count));
        res.setHeader('X-RateLimit-Limit',     String(Math.min(IP_LIMIT, SUBJECT_LIMIT)));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset',     String((bucket + 1) * WINDOW_SECONDS));

        if (!allowed) {
            const retryAfter = ((bucket + 1) * WINDOW_SECONDS) - Math.floor(Date.now() / 1000);
            res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
            return res.status(429).json({ error: 'Too many requests' });
        }
        next();
    } catch (err) {
        // Never block traffic on a rate-limiter Redis failure — log and pass.
        console.error('rateLimit lookup failed (allowing request):', err);
        next();
    }
}

module.exports = { matchRateLimit };
