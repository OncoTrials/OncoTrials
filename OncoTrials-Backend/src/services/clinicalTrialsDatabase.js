// src/services/clinicalTrialsDatabase.js
const supabase = require("../db/supabaseClient");

const IMPORTER_USER_ID = process.env.IMPORTER_USER_ID || null;

async function loadExistingTrials() {
    const { data: existingRows, error: existingErr } = await supabase
        .from("trials")
        .select("nct_id, id, status, last_fetched_at")
        .limit(200000);

    if (existingErr) throw existingErr;
    
    return new Map(
        (existingRows || []).filter((r) => r.nct_id).map((r) => [r.nct_id, r])
    );
}

async function getLastSuccessfulImportDate() {
    try {
        const { data, error } = await supabase
            .from("trial_import_jobs")
            .select("run_at")
            .is("error_text", null)
            .order("run_at", { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return null;
        
        return new Date(data[0].run_at).toISOString().split('T')[0];
    } catch (err) {
        console.warn("Could not fetch last import date:", err);
        return null;
    }
}

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
            .select("nct_id"); // only fetch nct_id; full rows could cause large egress

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
    // supabase-js reports failures via the returned `error`, not by throwing —
    // the old version ignored it, which hid a schema mismatch for months
    // (0 rows ever written, so incremental sync never engaged).
    try {
        const { error } = await supabase.from("trial_import_jobs").insert([jobData]);
        if (error) {
            console.error("trial_import_jobs insert FAILED (incremental sync depends on this row):", error.message);
        }
    } catch (err) {
        console.error("trial_import_jobs insert threw:", err);
    }
}

module.exports = {
    loadExistingTrials,
    getLastSuccessfulImportDate,
    upsertRowsAndSetCreator,
    updateExistingTrial,
    logImportJob
};