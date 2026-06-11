// Auth middleware. Accepts either:
//   1. A SMART-launch session JWT (issued by /fhir/callback). Verified locally
//      with jose. Populates `req.user = { id, source:'smart_launch', requestId, orgId }`.
//   2. A Supabase Auth JWT (legacy / internal calls). Validated via the
//      Supabase client. Populates `req.user = { id, email, source:'supabase_jwt' }`.
//
// Both paths converge on `req.user.id` so the route doesn't care which auth
// produced the request. PR 4 will add a third path: external API keys.

const supabase = require('../db/supabaseClient');
const sessionJwt = require('../services/sessionJwt');

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!m) return res.status(401).json({ error: 'Missing Bearer token' });
    const token = m[1];

    // 1. Try our session JWT first (cheap, local).
    try {
        const payload = await sessionJwt.verify(token);
        req.user = {
            id:        payload.sub,
            source:    'smart_launch',
            requestId: payload.rid ?? null,
            orgId:     payload.org ?? null,
        };
        return next();
    } catch {
        // Not a session JWT — fall through to Supabase.
    }

    // 2. Supabase JWT.
    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = {
            id:     data.user.id,
            email:  data.user.email,
            source: 'supabase_jwt',
        };
        return next();
    } catch (err) {
        console.error('Auth verification failed:', err);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

module.exports = { requireAuth };
