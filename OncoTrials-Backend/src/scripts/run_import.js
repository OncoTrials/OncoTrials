// src/scripts/run_import.js
require('dotenv').config();
const { fetchAndSyncStudies } = require('../services/clinicalTrialsService');
const { getAllowedCountries } = require('../config/trialImportConfig');
const { bumpCacheVersion, warmAllTrialsCache } = require('../services/trialsCache');
const { logImportJob } = require('../services/clinicalTrialsDatabase');

// TODO: Add concurrency check after deployment to prevent duplicate runs
async function main() {
  const startTime = new Date();
  const countries = getAllowedCountries();

  console.log(`🚀 Starting trial import at ${startTime.toISOString()}`);

  try {
    const maxPages = process.env.MAX_PAGES ? parseInt(process.env.MAX_PAGES, 10) : 0;
    const query = process.env.CTGOV_QUERY || '';

    console.log(`Configuration:
    - Max pages: ${maxPages === 0 ? 'unlimited' : maxPages}
    - Query: ${query || 'all trials'}
    - Allowed countries: ${countries.join(', ')}
    - Environment: ${process.env.NODE_ENV || 'development'}
    `);

    const result = await fetchAndSyncStudies({
      query,
      maxPages,
    });

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Import completed successfully!
    - Duration: ${duration.toFixed(2)} seconds
    - Pages fetched: ${result.pagesFetched}
    - Trials inserted: ${result.totalInserted}
    - Trials updated (changed): ${result.totalUpdated}
    - Trials unchanged: ${result.totalUnchanged}
    - Skipped (non-oncology): ${result.totalSkippedNonOncology}
    - Skipped (wrong country): ${result.totalSkippedCountry}
    - Skipped (closed/completed): ${result.totalSkippedClosed}
    - Upsert failures: ${result.totalFailed}
    - Finished at: ${endTime.toISOString()}
    `);

    const logEntry = {
      timestamp: endTime.toISOString(),
      duration,
      allowedCountries: countries,
      result,
      success: true,
    };
    console.log('IMPORT_RESULT_JSON:', JSON.stringify(logEntry));

    // Bust the read-side cache *after* a successful import so users see fresh
    // data on the next request:
    //   1. Bump trials:cache_version → invalidates per-page /trials caches AND
    //      the /api/v1/match result cache (which keys on trials version).
    //   2. Warm the :all cache → re-paginate Supabase once, write to Redis.
    //      User reads against /trials?limit=all then serve from Redis instantly,
    //      never blocking on Supabase pagination.
    //
    // Both happen here so the importer is the sole "cache refresher" in normal
    // operation — the only time the user-facing /trials?limit=all path ever
    // paginates Supabase itself is the very first cold-start request after a
    // fresh deploy.
    if (result.totalInserted > 0 || result.totalUpdated > 0) {
      await bumpCacheVersion('successful import run');
      try {
        const n = await warmAllTrialsCache();
        console.log(`🔄 :all cache refreshed with ${n} trials`);
      } catch (err) {
        console.error('Failed to refresh :all cache (continuing):', err?.message || err);
      }

      // TODO(cdn-purge): the /trials?limit=all and /trials/stream responses are
      // held at the CDN edge (s-maxage=3600, stale-while-revalidate=86400). The
      // Redis cache above is fresh immediately, but edge copies linger up to an
      // hour. For instant freshness after an import, invalidate the CDN here —
      // e.g. `gcloud compute url-maps invalidate-cdn-cache <map> --path "/trials*"`
      // (Cloud CDN) or a Firebase Hosting redeploy. Left as a follow-up so the
      // importer doesn't need deploy credentials wired in yet.
    } else {
      console.log('No inserts or updates; leaving trials cache as-is.');
    }

    process.exit(0);

  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.error(`❌ Import failed after ${duration.toFixed(2)} seconds:`, error);

    const logEntry = {
      timestamp: endTime.toISOString(),
      duration,
      error: { message: error.message, stack: error.stack, name: error.name },
      success: false,
    };
    console.log('IMPORT_RESULT_JSON:', JSON.stringify(logEntry));

    // Record the failure so getLastSuccessfulImportDate (which filters on
    // error_text IS NULL) never treats a crashed run as a sync baseline.
    await logImportJob({
      duration_seconds: duration,
      error_text: String(error.message || error).slice(0, 1000),
    });

    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Import interrupted by user❗');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('Import terminated by system❗');
  process.exit(143);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
