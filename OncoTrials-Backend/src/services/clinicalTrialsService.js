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
    upsertRowsAndSetCreator,
    fallbackBatchInsertWithRetries,
    updateExistingTrial,
    logImportJob,
} = require('./clinicalTrialsDatabase');

async function fetchAndSyncStudies({ query = "", maxPages = 0 } = {}) {
    const startTs = Date.now();

    // Preload existing NCT IDs and statuses
    const existingByNct = await loadExistingTrials();

    let pageToken = null;
    let pagesFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkippedCountry = 0;
    let totalSkippedClosed = 0;
    let totalUnchanged = 0;

    do {
        const { studies, nextPageToken } = await fetchStudiesPage({ query, pageToken });
        pageToken = nextPageToken;

        const rowsToUpsert = [];
        const rowsToUpdate = [];

        for (const study of studies) {
            // Country guard
            // Even though the API filters server-side, verify client-
            // side so nothing slips through.
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
                // Update path
                const { payload, hasChange } = buildUpdatePayload(row, existing);

                if (hasChange) {
                    rowsToUpdate.push({ nct_id: row.nct_id, payload });
                } else {
                    // Still bump last_fetched_at so we know the record
                    // was seen on this run (used by staleness detection).
                    rowsToUpdate.push({
                        nct_id: row.nct_id,
                        payload: { last_fetched_at: row.last_fetched_at },
                    });
                    totalUnchanged++;
                }
            } else {
                // Insert path
                if (shouldSkipNewTrial(row)) {
                    totalSkippedClosed++;
                    console.log(
                        "Skipping new trial (closed/completed):",
                        row.nct_id,
                        row.title
                    );
                    continue;
                }
                const rowForInsert = {
                    ...row,
                    created_by: process.env.IMPORTER_USER_ID || null,
                };
                rowsToUpsert.push(rowForInsert);
            }
        }

        // Count genuinely new rows (not already in DB)
        const newCandidatesCount = rowsToUpsert
            .map((r) => r.nct_id)
            .filter((n) => n && !existingByNct.has(n)).length;

        // Upsert new rows
        if (rowsToUpsert.length > 0) {
            const upsertResult = await upsertRowsAndSetCreator(rowsToUpsert);
            if (upsertResult.error) {
                console.warn(
                    "Upsert failed; falling back to batch insert:",
                    upsertResult.error
                );
                const fallbackResult = await fallbackBatchInsertWithRetries(rowsToUpsert);
                totalInserted += fallbackResult.insertedCount || 0;
            } else {
                totalInserted += newCandidatesCount;
            }
            // Track newly inserted NCTs so later pages don't re-insert
            for (const r of rowsToUpsert) {
                if (r.nct_id) existingByNct.set(r.nct_id, r);
            }
        }

        // Apply updates
        for (const u of rowsToUpdate) {
            const success = await updateExistingTrial(u.nct_id, u.payload);
            if (success) totalUpdated++;
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
