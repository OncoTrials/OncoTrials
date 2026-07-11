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
    let totalFailed = 0;
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

        // Rows queued for this page, tagged so successes can be counted as
        // insert vs update AFTER the write lands (counting up front reported
        // phantom inserts whenever a batch failed).
        const batchEntries = [];   // { row, isNew }

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
                    batchEntries.push({ row, isNew: false });
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
                batchEntries.push({ row, isNew: true });
            }
        }

        // Upsert only new/changed trials
        if (batchEntries.length > 0) {
            const rows = batchEntries.map((e) => e.row);
            const upsertResult = await upsertRowsAndSetCreator(rows);

            if (upsertResult.error) {
                console.warn(
                    "Batch upsert failed; falling back to individual upserts (slow):",
                    upsertResult.error
                );
                for (const entry of batchEntries) {
                    const single = await upsertRowsAndSetCreator([entry.row]);
                    if (single.error) {
                        totalFailed++;
                        console.error(`Upsert failed for ${entry.row.nct_id}:`, single.error.message || single.error);
                    } else {
                        entry.isNew ? totalInserted++ : totalUpdated++;
                        existingByNct.set(entry.row.nct_id, entry.row);
                    }
                }
            } else {
                for (const entry of batchEntries) {
                    entry.isNew ? totalInserted++ : totalUpdated++;
                    existingByNct.set(entry.row.nct_id, entry.row);
                }
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
        // A run with row-level failures is not a clean baseline for the next
        // incremental sync — record it so getLastSuccessfulImportDate skips it.
        error_text: totalFailed > 0 ? `${totalFailed} row(s) failed to upsert` : null,
    });

    return {
        pagesFetched,
        totalInserted,
        totalUpdated,
        totalFailed,
        totalUnchanged,
        totalSkippedCountry,
        totalSkippedClosed,
        durationSeconds,
    };
}

module.exports = { fetchAndSyncStudies, formatStudyToTrialRow };
