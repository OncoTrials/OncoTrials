// refresh_trials_cache.js — manually refresh the read-side trial cache.
//
// Run this after a direct DB change that the importer didn't make (e.g. a SQL
// migration that rewrote trial rows), so the API stops serving the old cached
// values without waiting for the next scheduled import.
//
//   node src/scripts/refresh_trials_cache.js
//   # or: npm run refresh-cache   (from OncoTrials-Backend)
//
// What it does (same two steps the importer runs after a successful sync):
//   1. bumpCacheVersion() — invalidates the per-page /trials caches AND the
//      /api/v1/match result cache (both key on the trials version).
//   2. warmAllTrialsCache() — re-paginates Supabase once and overwrites the
//      chunked :all cache that /trials?limit=all and /trials/stream serve.
//
// Requires the same env as the server (SUPABASE_* and UPSTASH_* in .env).

require('dotenv').config();
const { bumpCacheVersion, warmAllTrialsCache } = require('../services/trialsCache');
const { purgeCdnCache } = require('../services/cdnPurge');

(async () => {
    try {
        const version = await bumpCacheVersion('manual refresh_trials_cache');
        console.log(`Cache version bumped → ${version}`);
        const n = await warmAllTrialsCache();
        console.log(`:all cache re-warmed with ${n} trials`);

        const purge = await purgeCdnCache();
        console.log(purge.purged
            ? `CDN purged: ${purge.urls.join(', ')}`
            : `CDN purge skipped (${purge.reason})`);
        process.exit(0);
    } catch (err) {
        console.error('Cache refresh failed:', err?.message || err);
        process.exit(1);
    }
})();
