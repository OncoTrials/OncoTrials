// src/services/clinicalTrialsService.js
// ClinicalTrials.gov fetch & sync service for OncoRadar
// - Fetches pages using pageToken
// - Maps studies to our `trials` schema
// - Upserts (preferred) then falls back to batched inserts with retries
// - Skips inserting completed/closed trials (with multiple checks)
// - Updates existing trials and sets closed_at when applicable
// - Records a job row in trial_import_jobs

const axios = require("axios");
const supabase = require("../db/supabaseClient");

const BASE_URL =
    process.env.CTGOV_BASE_URL ||
    "https://beta-ut.clinicaltrials.gov/api/v2/studies";
const POLITE_DELAY_MS = Number(process.env.CTGOV_POLL_DELAY_MS || 500); // ms between requests
const BATCH_SIZE = Number(process.env.CTGOV_INSERT_BATCH_SIZE || 100);
const MAX_RETRIES = Number(process.env.CTGOV_MAX_RETRIES || 3);
const RETRY_BASE_MS = Number(process.env.CTGOV_RETRY_BASE_MS || 500);

const IMPORTER_USER_ID = process.env.IMPORTER_USER_ID || null; // UUID of system/importer user

// statuses considered closed/finished
const CLOSED_STATUSES = new Set([
    "COMPLETED",
    "TERMINATED",
    "WITHDRAWN",
    "SUSPENDED",
    "CLOSED_TO_ACCRUAL",
    "CLOSED_TO_ACCRUAL_AND_TREATMENT",
]);

// gene list for naive biomarker extraction
const GENE_SYMBOLS = [
    "KRAS",
    "NRAS",
    "HRAS",
    "EGFR",
    "HER2",
    "ERBB2",
    "NTRK1",
    "NTRK2",
    "NTRK3",
    "BRAF",
    "ALK",
    "ROS1",
    "PIK3CA",
    "PTEN",
    "TP53",
    "MET",
    "RET",
    "KIT",
    "PDGFRA",
];
const GENE_REGEX = new RegExp(`\\b(${GENE_SYMBOLS.join("|")})\\b`, "gi");

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function parseDateString(s) {
    if (!s) return null;
    try {
        // support yyyy-mm-dd, yyyy-mm, yyyy formats; normalize to YYYY-MM-DD or null
        const d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    } catch {
        return null;
    }
}

// returns true if dateStr is a date in the past relative to today (UTC)
function isDateInPast(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    // A date is "in the past" if it's strictly less than today (ignore time portion)
    return d.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
}

function extractBiomarkersFromText(text) {
    if (!text || typeof text !== "string") return null;
    const matches = Array.from(
        new Set((text.match(GENE_REGEX) || []).map((m) => m.toUpperCase()))
    );
    if (matches.length === 0) return null;
    return matches.join(", ");
}

// helper that splits a large array into smaller arrays (batches). We use it to send DB inserts in manageable batches (avoid payload limits, memory spikes, or long single transactions) and to retry smaller chunks if something fails. returns an array of sub-arrays.
function chunkArray(arr, size) {
    if (!Array.isArray(arr)) throw new TypeError("arr must be an array");
    if (typeof size !== "number" || size <= 0)
        throw new TypeError("size must be a positive number");

    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function formatStudyToTrialRow(study) {
    const ps = study.protocolSection || {};
    const idm = ps.identificationModule || {};
    const sm = ps.statusModule || {};
    const dm = ps.descriptionModule || {};
    const cm = ps.conditionsModule || {};
    const em = ps.eligibilityModule || {};
    const clm = ps.contactsLocationsModule || {};

    const nct_id = idm.nctId || null;

    const sponsor =
        ps.sponsorCollaboratorsModule?.leadSponsor?.name ||
        ps.sponsorCollaboratorsModule?.leadSponsor?.agency ||
        (idm.organization && idm.organization.fullName) ||
        null;

    const organization = (idm.organization && idm.organization.fullName) || null;
    const title = idm.briefTitle || idm.officialTitle || null;
    const summary = dm.briefSummary || dm.detailedDescription || null;
    const lastKnownStatus = sm.lastKnownStatus || sm.overallStatus || null;
    const conditions =
        cm.conditions && Array.isArray(cm.conditions) ? cm.conditions : null;
    const sex = em.sex || null;
    const minimumAge = em.minimumAge || null;

    const locations =
        clm.locations && Array.isArray(clm.locations) ? clm.locations : null;
    let location_city = null,
        location_state = null,
        location_country = null;
    let latitude = null,
        longitude = null;
    if (locations && locations.length > 0) {
        const loc = locations[0];
        location_city = loc.facility?.address?.city || loc.city || null;
        location_state = loc.facility?.address?.state || loc.state || null;
        location_country = loc.facility?.address?.country || loc.country || null;
        // extract geoPoint -> lat/lon if available
        const geo = loc.geoPoint || loc.facility?.geoPoint || null;
        if (geo) {
            latitude = typeof geo.lat === "number" ? geo.lat : geo.latitude || null;
            longitude =
                typeof geo.lon === "number"
                    ? geo.lon
                    : geo.longitude || geo.lng || null;
        }
    }

    const start_date = parseDateString(sm.startDateStruct?.date || null);
    const primary_completion_date = parseDateString(
        sm.primaryCompletionDateStruct?.date || null
    );
    const completion_date = parseDateString(
        sm.completionDateStruct?.date || null
    );

    const isClosed = CLOSED_STATUSES.has(
        (lastKnownStatus || "").toString().toUpperCase()
    );
    const closed_at = isClosed
        ? completion_date || primary_completion_date || null
        : null;

    const eligText =
        (em.eligibilityCriteria &&
            (em.eligibilityCriteria.textblock || em.eligibilityCriteria)) ||
        em.criteria?.textblock ||
        dm.detailedDescription ||
        dm.briefSummary ||
        null;

    const biomarker_criteria = extractBiomarkersFromText(eligText) || null;
    const source_version = study.versionHolder || study.version || null;

    return {
        nct_id,
        sponsor,
        organization,
        title,
        summary,
        status: lastKnownStatus,
        study_description: dm.detailedDescription || null,
        conditions,
        sex,
        minimum_age: minimumAge,
        location_city,
        location_state,
        location_country,
        latitude,
        longitude,
        locations,
        eligibility_criteria: eligText,
        biomarker_criteria,
        start_date,
        primary_completion_date,
        completion_date,
        closed_at,
        source: "clinicaltrials.gov",
        source_version,
        last_fetched_at: new Date().toISOString(),
        // created_by intentionally NOT included here for upsert; added for fallback insert
    };
}

// Upsert rows (without created_by) and then set created_by for rows that were inserted (created_by IS NULL).
// Returns { upsertedCount } on success, or { error } on failure.
async function upsertRowsAndSetCreator(rows) {
    if (!rows || rows.length === 0) return { upsertedCount: 0 };

    const rowsForUpsert = rows.map((r) => {
        const copy = { ...r };
        // ensure created_by not present for upsert to avoid overwriting existing created_by
        delete copy.created_by;
        return copy;
    });

    try {
        const { data, error } = await supabase
            .from("trials")
            .upsert(rowsForUpsert, { onConflict: "nct_id" });

        if (error) return { error };

        const upsertedCount = (data && data.length) || 0;

        // set created_by to IMPORTER_USER_ID only for rows where created_by is null and nct_id in set
        if (IMPORTER_USER_ID) {
            const newNctIds = rows.map((r) => r.nct_id).filter(Boolean);
            if (newNctIds.length > 0) {
                const { error: setCreatorError } = await supabase
                    .from("trials")
                    .update({ created_by: IMPORTER_USER_ID })
                    .is("created_by", null)
                    .in("nct_id", newNctIds);

                if (setCreatorError) {
                    console.warn(
                        "Could not set created_by for new rows:",
                        setCreatorError
                    );
                }
            }
        }

        return { upsertedCount };
    } catch (err) {
        return { error: err };
    }
}

// Fallback: insert batches with retries. includes created_by in each inserted row.
// Returns { insertedCount }.
async function fallbackBatchInsertWithRetries(rows) {
    if (!rows || rows.length === 0) return { insertedCount: 0 };
    let totalInserted = 0;
    const batches = chunkArray(rows, BATCH_SIZE);

    for (const batch of batches) {
        let attempt = 0;
        let success = false;
        while (attempt < MAX_RETRIES && !success) {
            attempt++;
            try {
                const batchWithCreator = batch.map((r) => ({
                    ...r,
                    created_by: IMPORTER_USER_ID || null,
                }));
                const { data, error } = await supabase
                    .from("trials")
                    .insert(batchWithCreator);

                if (error) {
                    const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
                    console.warn(
                        `Batch insert error attempt ${attempt}, retrying in ${backoff}ms`,
                        error.message || error
                    );
                    await sleep(backoff);
                } else {
                    totalInserted += (data && data.length) || 0;
                    success = true;
                }
            } catch (err) {
                const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(
                    `Batch insert exception attempt ${attempt}, retrying in ${backoff}ms`,
                    err
                );
                await sleep(backoff);
            }
        }
        if (!success) {
            console.error(
                "Failed to insert batch after retries; continuing with next batch."
            );
        }
    }

    return { insertedCount: totalInserted };
}

async function fetchAndSyncStudies({ query = "", maxPages = 0 } = {}) {
    const startTs = Date.now();

    // preload existing nct ids and statuses
    const { data: existingRows, error: existingErr } = await supabase
        .from("trials")
        .select("nct_id, id, status")
        .limit(200000);

    if (existingErr) throw existingErr;
    const existingByNct = new Map(
        (existingRows || []).filter((r) => r.nct_id).map((r) => [r.nct_id, r])
    );

    let pageToken = null;
    let pagesFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    do {
        const params = {};
        if (query) params.q = query;
        if (pageToken) params.pageToken = pageToken;
        const url = Object.keys(params).length
            ? `${BASE_URL}?${new URLSearchParams(params)}`
            : BASE_URL;

        console.log("Fetching page:", url);
        const resp = await axios.get(url, { timeout: 60000 });
        const body = resp.data || {};
        const studies = body.studies || [];
        pageToken = body.nextPageToken || null;

        const rowsToUpsert = [];
        const rowsToUpdate = [];

        for (const study of studies) {
            const row = formatStudyToTrialRow(study);
            if (!row.nct_id) {
                console.log("Skipping study without nct_id");
                continue;
            }

            // Skip rules for new inserts:
            // - skip if status is closed
            // - skip if primary_completion_date or completion_date is in the past
            const isClosedByStatus = CLOSED_STATUSES.has(
                (row.status || "").toString().toUpperCase()
            );
            const primaryDone = isDateInPast(row.primary_completion_date);
            const completionDone = isDateInPast(row.completion_date);

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
                    updatePayload.primary_completion_date =
                        row.primary_completion_date || null;
                    updatePayload.completion_date = row.completion_date || null;
                    updatePayload.study_description = row.study_description || null;
                    updatePayload.summary = row.summary || null;
                } else {
                    // still update last_fetched_at to show we've checked it
                    needsUpdate = true;
                }

                if (needsUpdate)
                    rowsToUpdate.push({ nct_id: row.nct_id, payload: updatePayload });
            } else {
                // New trial candidate: skip if closed or completion in past
                if (isClosedByStatus || primaryDone || completionDone) {
                    console.log(
                        "Skipping new trial (closed/completed):",
                        row.nct_id,
                        row.title,
                        { isClosedByStatus, primaryDone, completionDone }
                    );
                    continue;
                }
                // add created_by before fallback insert; upsert will skip created_by but fallback insert uses it
                const rowForInsert = { ...row, created_by: IMPORTER_USER_ID || null };
                rowsToUpsert.push(rowForInsert);
            }
        }

        // count how many of the upsert candidates are actually new (not in existingByNct)
        const newCandidatesNctIds = rowsToUpsert
            .map((r) => r.nct_id)
            .filter((n) => n && !existingByNct.has(n));
        const newCandidatesCount = newCandidatesNctIds.length;

        // Upsert new rows (preferred)
        if (rowsToUpsert.length > 0) {
            const upsertResult = await upsertRowsAndSetCreator(rowsToUpsert);
            if (upsertResult.error) {
                // fallback to batch insert
                console.warn(
                    "Upsert failed; falling back to batch insert",
                    upsertResult.error
                );
                const fallbackResult = await fallbackBatchInsertWithRetries(
                    rowsToUpsert
                );
                totalInserted += fallbackResult.insertedCount || 0;
            } else {
                // consider "new candidates" as inserted for totalInserted (upsert updates existing rows too)
                totalInserted += newCandidatesCount;
            }
        }

        // apply updates
        for (const u of rowsToUpdate) {
            try {
                const { data: updated, error: updateError } = await supabase
                    .from("trials")
                    .update(u.payload)
                    .eq("nct_id", u.nct_id);

                if (updateError) {
                    console.error("Update error for", u.nct_id, updateError);
                } else {
                    totalUpdated += 1;
                }
            } catch (err) {
                console.error("Update exception for", u.nct_id, err);
            }
        }

        pagesFetched += 1;
        await sleep(POLITE_DELAY_MS);

        if (maxPages && pagesFetched >= maxPages) break;
    } while (pageToken);

    const durationSeconds = (Date.now() - startTs) / 1000;

    // write job summary
    try {
        await supabase.from("trial_import_jobs").insert([
            {
                pages_fetched: pagesFetched,
                total_inserted: totalInserted,
                total_updated: totalUpdated,
                duration_seconds: durationSeconds,
            },
        ]);
    } catch (err) {
        console.warn("Could not write job summary row:", err);
    }

    return { pagesFetched, totalInserted, totalUpdated, durationSeconds };
}

module.exports = { fetchAndSyncStudies, formatStudyToTrialRow };
