// src/scripts/remove_expired_trials.js
//
// Scans every trial in the DB and deletes any that are "expired" based on
// status or past completion dates.
//
// "Expired" definition:
// 1. Status is in CLOSED_STATUSES (e.g., COMPLETED, TERMINATED, WITHDRAWN, SUSPENDED, ACTIVE_NOT_RECRUITING).
// 2. primary_completion_date is in the past.
// 3. completion_date is in the past.
//
// Usage:
//   node src/scripts/remove_expired_trials.js
//   DELETE_EXPIRED_DRY_RUN=false node src/scripts/remove_expired_trials.js
//
// Defaults to DRY RUN (no deletions) unless DELETE_EXPIRED_DRY_RUN=false is set.

require('dotenv').config();
const { CLOSED_STATUSES } = require('../config/trialImportConfig');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const TABLE = 'trials';
const BATCH_SIZE = 500;

// Default to dry-run
const DELETE_EXPIRED_DRY_RUN = (process.env.DELETE_EXPIRED_DRY_RUN || 'true').toLowerCase() !== 'false';

function getSupabase() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function isDateInPast(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    // Use end of today to be conservative
    return d.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
}

async function main() {
    console.log(`🔍 Removing expired trials...`);
    console.log(`   Mode: ${DELETE_EXPIRED_DRY_RUN ? 'DRY RUN (no deletes)' : '⚠️  LIVE — deletions will occur'}`);
    console.log();

    const supabase = getSupabase();

    let from = 0;
    let totalScanned = 0;
    let toRemove = [];

    while (true) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('id, nct_id, status, primary_completion_date, completion_date, title')
            .range(from, from + BATCH_SIZE - 1)
            .order('id', { ascending: true });

        if (error) {
            console.error('❌ Failed to fetch trials:', error.message);
            process.exit(1);
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
            totalScanned++;
            
            const isClosed = CLOSED_STATUSES.has((row.status || '').toString().toUpperCase());
            const primaryPast = isDateInPast(row.primary_completion_date);
            const completionPast = isDateInPast(row.completion_date);

            if (isClosed || primaryPast || completionPast) {
                let reason = [];
                if (isClosed) reason.push(`Status: ${row.status}`);
                if (primaryPast) reason.push(`Primary Completion Date: ${row.primary_completion_date}`);
                if (completionPast) reason.push(`Completion Date: ${row.completion_date}`);

                toRemove.push({
                    id: row.id,
                    nct_id: row.nct_id,
                    reason: reason.join(' | '),
                    title: (row.title || '').slice(0, 60),
                });
            }
        }

        from += data.length;
        if (data.length < BATCH_SIZE) break;
    }

    console.log(`Scanned ${totalScanned} trials. Found ${toRemove.length} expired trials.`);

    if (toRemove.length === 0) {
        console.log('✅ Nothing to remove — all trials are current.');
        process.exit(0);
    }

    // Preview
    console.log();
    console.log('Expired trials to remove:');
    console.log('─'.repeat(120));
    for (const t of toRemove) {
        console.log(`  ${(t.nct_id || '').padEnd(12)} | ${t.reason.padEnd(60)} | ${t.title}`);
    }
    console.log('─'.repeat(120));
    console.log(`Total: ${toRemove.length}`);
    console.log();

    if (DELETE_EXPIRED_DRY_RUN) {
        console.log('🏁 Dry run complete. Set DELETE_EXPIRED_DRY_RUN=false to actually delete these trials.');
        process.exit(0);
    }

    // Live deletion
    console.log('🗑️  Deleting trials in batches...');
    let totalDeleted = 0;

    const ids = toRemove.map((t) => t.id);
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const { error: delError, count } = await supabase
            .from(TABLE)
            .delete({ count: 'exact' })
            .in('id', chunk);

        if (delError) {
            console.error(`❌ Delete failed at offset ${i}:`, delError.message);
            process.exit(1);
        }

        totalDeleted += count || chunk.length;
        console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} rows)`);
    }

    console.log();
    console.log(`✅ Done. Removed ${totalDeleted} expired trials.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
