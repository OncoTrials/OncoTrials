// src/services/clinicalTrialsDatabase.js
const supabase = require("../db/supabaseClient");

const BATCH_SIZE = Number(process.env.CTGOV_INSERT_BATCH_SIZE || 100);
const MAX_RETRIES = Number(process.env.CTGOV_MAX_RETRIES || 3);
const RETRY_BASE_MS = Number(process.env.CTGOV_RETRY_BASE_MS || 500);
const IMPORTER_USER_ID = process.env.IMPORTER_USER_ID || null;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

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

async function loadExistingTrials() {
    const { data: existingRows, error: existingErr } = await supabase
        .from("trials")
        .select("nct_id, id, status")
        .limit(200000);

    if (existingErr) throw existingErr;
    
    return new Map(
        (existingRows || []).filter((r) => r.nct_id).map((r) => [r.nct_id, r])
    );
}

// Fixed: Upsert with .select() to get reliable data back
async function upsertRowsAndSetCreator(rows) {
    if (!rows || rows.length === 0) return { upsertedCount: 0 };

    const rowsForUpsert = rows.map((r) => {
        const copy = { ...r };
        delete copy.created_by;
        return copy;
    });

    try {
        const { data, error } = await supabase
            .from("trials")
            .upsert(rowsForUpsert, { onConflict: "nct_id" })
            .select(); // Fix #1: This ensures reliable data return

        if (error) return { error };

        const upsertedCount = (data && data.length) || 0;

        if (IMPORTER_USER_ID) {
            const newNctIds = rows.map((r) => r.nct_id).filter(Boolean);
            if (newNctIds.length > 0) {
                const { error: setCreatorError } = await supabase
                    .from("trials")
                    .update({ created_by: IMPORTER_USER_ID })
                    .is("created_by", null)
                    .in("nct_id", newNctIds);

                if (setCreatorError) {
                    console.warn("Could not set created_by for new rows:", setCreatorError);
                }
            }
        }

        return { upsertedCount };
    } catch (err) {
        return { error: err };
    }
}

// Fixed: Better error handling in fallback
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
                    .insert(batchWithCreator)
                    .select(); // Add .select() for consistency

                if (error) {
                    // Fix #2: Handle unique constraint violations properly
                    if (error.code === '23505') {
                        console.warn(`Unique constraint violation for batch, skipping:`, error.message);
                        success = true;
                        break;
                    }
                    
                    if (attempt === MAX_RETRIES) {
                        console.error(`Batch insert failed after ${MAX_RETRIES} attempts:`, error);
                        break;
                    }
                    
                    const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
                    console.warn(`Batch insert error attempt ${attempt}, retrying in ${backoff}ms`, error.message || error);
                    await sleep(backoff);
                } else {
                    totalInserted += (data && data.length) || batch.length;
                    success = true;
                }
            } catch (err) {
                if (attempt === MAX_RETRIES) {
                    console.error(`Batch insert exception after ${MAX_RETRIES} attempts:`, err);
                    break;
                }
                
                const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(`Batch insert exception attempt ${attempt}, retrying in ${backoff}ms`, err);
                await sleep(backoff);
            }
        }
    }

    return { insertedCount: totalInserted };
}

async function updateExistingTrial(nct_id, updatePayload) {
    try {
        const { error: updateError } = await supabase
            .from("trials")
            .update(updatePayload)
            .eq("nct_id", nct_id);

        if (updateError) {
            console.error("Update error for", nct_id, updateError);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Update exception for", nct_id, err);
        return false;
    }
}

async function logImportJob(jobData) {
    try {
        await supabase.from("trial_import_jobs").insert([jobData]);
    } catch (err) {
        console.warn("Could not write job summary row:", err);
    }
}

module.exports = { 
    loadExistingTrials,
    upsertRowsAndSetCreator,
    fallbackBatchInsertWithRetries,
    updateExistingTrial,
    logImportJob
};