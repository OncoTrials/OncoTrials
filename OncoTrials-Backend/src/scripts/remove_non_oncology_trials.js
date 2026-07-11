// src/scripts/remove_non_oncology_trials.js
//
// One-off cleanup that deletes trials whose conditions are not oncology.
// The corpus was originally imported without an oncology filter, so ~69% of
// rows are non-cancer trials that bloat storage and inflate every cache-warm
// egress hit. The importer now filters at ingest (see trialImportConfig
// ONCOLOGY_ONLY); this prunes the pre-existing rows to match.
//
// Usage (dry-run by default — preview only):
//   node src/scripts/remove_non_oncology_trials.js
//   node src/scripts/remove_non_oncology_trials.js --live     # actually delete
//
// After a --live run, refresh the read cache:
//   npm run refresh-cache

require('dotenv').config();
const { ONCOLOGY_REGEX } = require('../config/trialImportConfig');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const TABLE = 'trials';
const BATCH_SIZE = 500;

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--live');

function getSupabase() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Mirror the importer's client-side guard: check the structured condition
// list (not free text) so mechanism names don't cause false keeps.
function isOncologyRow(row) {
    const conditions = Array.isArray(row.conditions) ? row.conditions.join(' ') : '';
    return ONCOLOGY_REGEX.test(`${conditions} ${row.title || ''}`);
}

async function main() {
    console.log('Remove non-oncology trials');
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no deletes)' : 'LIVE — deletions will occur'}`);
    console.log();

    const supabase = getSupabase();

    let from = 0;
    let totalScanned = 0;
    const toRemove = [];

    while (true) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('id, nct_id, title, conditions')
            .range(from, from + BATCH_SIZE - 1)
            .order('id', { ascending: true });

        if (error) {
            console.error('Failed to fetch trials:', error.message);
            process.exit(1);
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
            totalScanned++;
            if (!isOncologyRow(row)) {
                toRemove.push({ id: row.id, nct_id: row.nct_id, title: (row.title || '').slice(0, 80) });
            }
        }

        from += data.length;
        if (data.length < BATCH_SIZE) break;
    }

    console.log(`Scanned ${totalScanned} trials. Found ${toRemove.length} non-oncology (${((toRemove.length / Math.max(totalScanned, 1)) * 100).toFixed(1)}%).`);

    if (toRemove.length === 0) {
        console.log('Nothing to remove.');
        process.exit(0);
    }

    // Preview only the first 20 so the log stays readable on a big prune.
    console.log('\nSample of trials to remove (first 20):');
    for (const t of toRemove.slice(0, 20)) {
        console.log(`  ${t.nct_id || t.id}  |  ${t.title}`);
    }
    console.log(`  ...and ${Math.max(0, toRemove.length - 20)} more\n`);

    if (DRY_RUN) {
        console.log('Dry run complete. Re-run with --live to delete, then `npm run refresh-cache`.');
        process.exit(0);
    }

    let totalDeleted = 0;
    const ids = toRemove.map((t) => t.id);
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const { error: delError, count } = await supabase
            .from(TABLE)
            .delete({ count: 'exact' })
            .in('id', chunk);

        if (delError) {
            console.error(`Delete failed at offset ${i}:`, delError.message);
            process.exit(1);
        }
        totalDeleted += count || chunk.length;
        console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} rows)`);
    }

    console.log(`\nDone. Removed ${totalDeleted} non-oncology trials. Now run: npm run refresh-cache`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
