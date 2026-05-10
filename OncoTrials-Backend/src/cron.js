const cron = require('node-cron');
const { fetchAndSyncStudies } = require('./services/clinicalTrialsService');

// run every 60 minutes
cron.schedule('*/60 * * * *', async () => {
  console.log('Starting trials sync job', new Date().toISOString());
  try {
    const result = await fetchAndSyncStudies({ query: 'cancer', maxPages: 0 });
    console.log('Sync result:', result);
  } catch (err) {
    console.error('Sync failed:', err);
  }
});
