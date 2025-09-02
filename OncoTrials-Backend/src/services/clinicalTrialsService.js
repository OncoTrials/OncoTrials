// src/services/clinicalTrialsService.js
const { fetchStudiesPage, respectRateLimit } = require('./clinicalTrialsApi');
const { formatStudyToTrialRow, shouldSkipNewTrial } = require('./clinicalTrialsProcessor');
const { 
    loadExistingTrials,
    upsertRowsAndSetCreator,
    fallbackBatchInsertWithRetries,
    updateExistingTrial,
    logImportJob
} = require('./clinicalTrialsDatabase');

async function fetchAndSyncStudies({ query = "", maxPages = 0 } = {}) {
    const startTs = Date.now();

    // preload existing nct ids and statuses
    const existingByNct = await loadExistingTrials();

    let pageToken = null;
    let pagesFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    do {
        const { studies, nextPageToken } = await fetchStudiesPage({ query, pageToken });
        pageToken = nextPageToken;

        const rowsToUpsert = [];
        const rowsToUpdate = [];

        for (const study of studies) {
            const row = formatStudyToTrialRow(study);
            if (!row.nct_id) {
                console.log("Skipping study without nct_id");
                continue;
            }

            const existing = existingByNct.get(row.nct_id);
            if (existing) {
                // prepare update payload if needed
                const remoteStatus = (row.status || "").toString();
                const localStatus = (existing.status || "").toString();
                const updatePayload = { last_fetched_at: row.last_fetched_at };

                let needsUpdate = false;
                if (remoteStatus !== localStatus) {
                    needsUpdate = true;
                    updatePayload.status = row.status;
                    if (row.closed_at) updatePayload.closed_at = row.closed_at;
                    updatePayload.primary_completion_date = row.primary_completion_date || null;
                    updatePayload.completion_date = row.completion_date || null;
                    updatePayload.study_description = row.study_description || null;
                    updatePayload.summary = row.summary || null;
                } else {
                    needsUpdate = true;
                }

                if (needsUpdate)
                    rowsToUpdate.push({ nct_id: row.nct_id, payload: updatePayload });
            } else {
                // New trial candidate: skip if closed or completion in past
                if (shouldSkipNewTrial(row)) {
                    console.log("Skipping new trial (closed/completed):", row.nct_id, row.title);
                    continue;
                }
                const rowForInsert = { ...row, created_by: process.env.IMPORTER_USER_ID || null };
                rowsToUpsert.push(rowForInsert);
            }
        }

        // count how many of the upsert candidates are actually new
        const newCandidatesCount = rowsToUpsert
            .map((r) => r.nct_id)
            .filter((n) => n && !existingByNct.has(n)).length;

        // Upsert new rows (preferred)
        if (rowsToUpsert.length > 0) {
            const upsertResult = await upsertRowsAndSetCreator(rowsToUpsert);
            if (upsertResult.error) {
                console.warn("Upsert failed; falling back to batch insert:", upsertResult.error);
                const fallbackResult = await fallbackBatchInsertWithRetries(rowsToUpsert);
                totalInserted += fallbackResult.insertedCount || 0;
            } else {
                totalInserted += newCandidatesCount;
            }
        }

        // apply updates
        for (const u of rowsToUpdate) {
            const success = await updateExistingTrial(u.nct_id, u.payload);
            if (success) totalUpdated++;
        }

        pagesFetched += 1;
        await respectRateLimit();

        if (maxPages && pagesFetched >= maxPages) break;
    } while (pageToken);

    const durationSeconds = (Date.now() - startTs) / 1000;

    // write job summary
    await logImportJob({
        pages_fetched: pagesFetched,
        total_inserted: totalInserted,
        total_updated: totalUpdated,
        duration_seconds: durationSeconds,
    });

    return { pagesFetched, totalInserted, totalUpdated, durationSeconds };
}

module.exports = { fetchAndSyncStudies, formatStudyToTrialRow };