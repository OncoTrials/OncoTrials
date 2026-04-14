// src/scripts/run_import.js
require('dotenv').config();
const { fetchAndSyncStudies } = require('../services/clinicalTrialsService');

async function main() {
  const startTime = new Date();
  console.log(`🚀 Starting trial import at ${startTime.toISOString()}`);
  
  try {
    // Get maxPages from environment variable (set by GitHub Actions or default to 0 for fetching every page)
    const maxPages = process.env.MAX_PAGES ? parseInt(process.env.MAX_PAGES, 10) : 0;
    const query = process.env.CTGOV_QUERY || '';
    
    console.log(`Configuration:
    - Max pages: ${maxPages === 0 ? 'unlimited' : maxPages}
    - Query: ${query || 'all trials'}
    - Environment: ${process.env.NODE_ENV || 'development'}
    `);
    
    // Run the import
    const result = await fetchAndSyncStudies({ 
      query: query, 
      maxPages: maxPages 
    });
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Import completed successfully!
    - Duration: ${duration.toFixed(2)} seconds
    - Pages fetched: ${result.pagesFetched}
    - Trials inserted: ${result.totalInserted}
    - Trials updated: ${result.totalUpdated}
    - Finished at: ${endTime.toISOString()}
    `);
    
    // Create a simple log file for GitHub Actions artifacts
    const logEntry = {
      timestamp: endTime.toISOString(),
      duration: duration,
      result: result,
      success: true
    };
    
    // Write log in a format that's easy to parse
    console.log('IMPORT_RESULT_JSON:', JSON.stringify(logEntry));
    
    process.exit(0);
    
  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.error(`❌ Import failed after ${duration.toFixed(2)} seconds:`, error);
    
    // Log failure details
    const logEntry = {
      timestamp: endTime.toISOString(),
      duration: duration,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      success: false
    };
    
    console.log('IMPORT_RESULT_JSON:', JSON.stringify(logEntry));
    
    process.exit(1);
  }
}

// Handle cleanup on termination
process.on('SIGINT', () => {
  console.log('🛑 Import interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('🛑 Import terminated by system');
  process.exit(143);
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();