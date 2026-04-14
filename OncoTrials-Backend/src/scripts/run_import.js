// src/scripts/run_import.js
require('dotenv').config();
const { fetchAndSyncStudies } = require('../services/clinicalTrialsService');
const { getAllowedCountries } = require('../config/trialImportConfig');

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
    - Skipped (wrong country): ${result.totalSkippedCountry}
    - Skipped (closed/completed): ${result.totalSkippedClosed}
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

    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('🛑 Import interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('🛑 Import terminated by system');
  process.exit(143);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
