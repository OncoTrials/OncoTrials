// cdnPurge.js — best-effort CDN cache invalidation after an import.
//
// Architecture note: the Cloud Run backend (*.run.app) has no CDN in front of
// it, so its Cache-Control only reaches the browser. The project's shared CDN
// is Cloudflare, which fronts the public site (trialsonco.com). This helper
// purges Cloudflare so that IF the trial API is served through a Cloudflare-
// proxied hostname (e.g. an api.trialsonco.com proxied DNS record or a
// Cloudflare route/Worker), a fresh import is visible immediately instead of
// waiting out the edge TTL. If you hit the raw run.app URL directly, there is
// no shared cache to purge and this is a no-op — which is exactly what it does
// when unconfigured.
//
// Configure via env (all optional — absent = no-op):
//   CLOUDFLARE_API_TOKEN   API token with the "Cache Purge" permission on the zone
//   CLOUDFLARE_ZONE_ID     the zone that serves the trial API responses
//   CDN_PURGE_URLS         comma-separated absolute URLs to purge. Defaults to
//                          the two Browse-All endpoints under
//                          PUBLIC_API_ORIGIN if that is set.
//   PUBLIC_API_ORIGIN      origin the browser actually calls, e.g.
//                          https://api.trialsonco.com (used to build defaults)

const CF_API = 'https://api.cloudflare.com/client/v4';

function purgeTargets() {
    if (process.env.CDN_PURGE_URLS) {
        return process.env.CDN_PURGE_URLS.split(',').map((u) => u.trim()).filter(Boolean);
    }
    const origin = (process.env.PUBLIC_API_ORIGIN || '').replace(/\/+$/, '');
    if (!origin) return [];
    // The list endpoints whose edge copies an import makes stale.
    return [
        `${origin}/trials?limit=all`,
        `${origin}/trials/stream`,
    ];
}

/**
 * Purge the trial-list URLs from Cloudflare. Never throws — a CDN purge
 * failure must not fail the import. Returns a small status object for logging.
 */
async function purgeCdnCache() {
    const token  = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const urls   = purgeTargets();

    if (!token || !zoneId) {
        return { purged: false, reason: 'cloudflare_not_configured' };
    }
    if (urls.length === 0) {
        return { purged: false, reason: 'no_purge_targets (set CDN_PURGE_URLS or PUBLIC_API_ORIGIN)' };
    }

    try {
        const res = await fetch(`${CF_API}/zones/${zoneId}/purge_cache`, {
            method:  'POST',
            headers: {
                Authorization:  `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: urls }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.success === false) {
            return { purged: false, reason: `cloudflare_error_${res.status}`, errors: body.errors };
        }
        return { purged: true, urls };
    } catch (err) {
        return { purged: false, reason: 'purge_request_failed', error: err?.message || String(err) };
    }
}

module.exports = { purgeCdnCache, _purgeTargets: purgeTargets };
