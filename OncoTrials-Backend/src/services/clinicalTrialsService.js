// src/services/clinicalTrialsService.js
const { fetchStudiesPage, respectRateLimit } = require('./clinicalTrialsApi');
const {
    formatStudyToTrialRow,
    shouldSkipNewTrial,
    hasAllowedLocation,
    buildUpdatePayload,
    CLOSED_STATUSES,
} = require('./clinicalTrialsProcessor');
const {
    loadExistingTrials,
    getLastSuccessfulImportDate,
    upsertRowsAndSetCreator,
    fallbackBatchInsertWithRetries,
    updateExistingTrial,
    logImportJob,
} = require('./clinicalTrialsDatabase');

async function fetchAndSyncStudies({ query = "", maxPages = 0 } = {}) {
    const startTs = Date.now();

    // Preload existing NCT IDs and statuses
    const existingByNct = await loadExistingTrials();
    
    // Get last successful run date for incremental sync
    const lastUpdatePostDate = await getLastSuccessfulImportDate();
    if (lastUpdatePostDate) {
        console.log(`📡 Incremental sync enabled: fetching trials updated since ${lastUpdatePostDate}`);
    } else {
        console.log(`📡 Full sync: fetching all trials (no previous successful run found)`);
    }

    let pageToken = null;
    let pagesFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkippedCountry = 0;
    let totalSkippedClosed = 0;
    let totalUnchanged = 0;

    do {
        const { studies, nextPageToken } = await fetchStudiesPage({ 
            query, 
            pageToken,
            lastUpdatePostDate 
        });
        pageToken = nextPageToken;

        const batchToUpsert = [];

        for (const study of studies) {
            // Country guard
            const studyLocations =
                study.protocolSection?.contactsLocationsModule?.locations;
            if (!hasAllowedLocation(studyLocations || [])) {
                totalSkippedCountry++;
                continue;
            }

            const row = formatStudyToTrialRow(study);
            if (!row.nct_id) {
                console.log("Skipping study without nct_id");
                continue;
            }

            const existing = existingByNct.get(row.nct_id);

            if (existing) {
                const { hasChange } = buildUpdatePayload(row, existing);

                if (hasChange) {
                    batchToUpsert.push(row);
                    totalUpdated++;
                } else {
                    // Skip DB write entirely — nothing to update
                    totalUnchanged++;
                }
            } else {
                // Insert path
                if (shouldSkipNewTrial(row)) {
                    totalSkippedClosed++;
                    continue;
                }
                batchToUpsert.push(row);
                totalInserted++;
            }
        }

        // Upsert only new/changed trials
        if (batchToUpsert.length > 0) {
            const upsertResult = await upsertRowsAndSetCreator(batchToUpsert);
            if (upsertResult.error) {
                console.warn(
                    "Batch upsert failed; falling back to individual updates (slow):",
                    upsertResult.error
                );
                for (const row of batchToUpsert) {
                    await upsertRowsAndSetCreator([row]);
                }
            }

            for (const r of batchToUpsert) {
                if (r.nct_id) existingByNct.set(r.nct_id, r);
            }
        }

        pagesFetched += 1;
        await respectRateLimit();

        if (maxPages && pagesFetched >= maxPages) break;
    } while (pageToken);

    const durationSeconds = (Date.now() - startTs) / 1000;

    await logImportJob({
        pages_fetched: pagesFetched,
        total_inserted: totalInserted,
        total_updated: totalUpdated,
        total_unchanged: totalUnchanged,
        total_skipped_country: totalSkippedCountry,
        total_skipped_closed: totalSkippedClosed,
        duration_seconds: durationSeconds,
    });

    return {
        pagesFetched,
        totalInserted,
        totalUpdated,
        totalUnchanged,
        totalSkippedCountry,
        totalSkippedClosed,
        durationSeconds,
    };
}

module.exports = { fetchAndSyncStudies, formatStudyToTrialRow };
