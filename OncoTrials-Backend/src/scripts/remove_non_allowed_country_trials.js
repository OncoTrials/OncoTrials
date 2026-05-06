// src/scripts/remove_non_allowed_country_trials.js
//
// One-off (or scheduled) helper that scans every trial in the DB and
// deletes any whose location_country does not match the allowed-countries
// list in trialImportConfig.  Safe to run multiple times.
//
// Usage:
//   node src/scripts/remove_non_allowed_country_trials.js
//   DELETE_TRIALS_DRY_RUN=true node src/scripts/remove_non_allowed_country_trials.js
//
// Set DELETE_TRIALS_DRY_RUN=true (or omit the flag — defaults to dry-run) to preview
// what would be removed without touching the database.

require('dotenv').config();
const { buildAllowedCountrySet, getAllowedCountries } = require('../config/trialImportConfig');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const TABLE = 'trials';
const BATCH_SIZE = 500;

// Default to dry-run unless --live flag is present
const args = process.argv.slice(2);
const DELETE_TRIALS_DRY_RUN = !args.includes('--live');

function getSupabase() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function main() {
    const allowedSet = buildAllowedCountrySet();
    const allowedDisplay = getAllowedCountries();

    console.log(`Remove trials outside allowed countries`);
    console.log(`   Allowed countries: ${allowedDisplay.join(', ')}`);
    console.log(`   Mode: ${DELETE_TRIALS_DRY_RUN ? 'DRY RUN (no deletes)' : '⚠️  LIVE — deletions will occur'}`);
    console.log();

    const supabase = getSupabase();

    // Fetch all trials with their location_country (and nct_id for logging).
    // We page through in batches to avoid memory issues on large tables.
    let from = 0;
    let totalScanned = 0;
    let toRemove = [];

    while (true) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('id, nct_id, location_country, title')
            .range(from, from + BATCH_SIZE - 1)
            .order('id', { ascending: true });

        if (error) {
            console.error('Failed to fetch trials:', error.message);
            process.exit(1);
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
            totalScanned++;
            const country = (row.location_country || '').toLowerCase().trim();

            // A trial with no country at all is also non-compliant
            if (!country || !allowedSet.has(country)) {
                toRemove.push({
                    id: row.id,
                    nct_id: row.nct_id,
                    location_country: row.location_country || '(none)',
                    title: (row.title || '').slice(0, 80),
                });
            }
        }

        from += data.length;
        if (data.length < BATCH_SIZE) break; // last page
    }

    console.log(`Scanned ${totalScanned} trials. Found ${toRemove.length} outside allowed countries.`);

    if (toRemove.length === 0) {
        console.log('Nothing to remove — all trials are in allowed countries.');
        process.exit(0);
    }

    // Preview
    console.log();
    console.log('Trials to remove:');
    console.log('─'.repeat(100));
    for (const t of toRemove) {
        console.log(`  ${t.nct_id || t.id}  |  country: ${t.location_country}  |  ${t.title}`);
    }
    console.log('─'.repeat(100));
    console.log(`Total: ${toRemove.length}`);
    console.log();

    if (DELETE_TRIALS_DRY_RUN) {
        console.log('Dry run complete. Set DELETE_TRIALS_DRY_RUN=false to actually delete these trials.');
        process.exit(0);
    }

    // Live deletion
    console.log(' Deleting trials in batches...');
    let totalDeleted = 0;

    // Delete in chunks to stay within Supabase request limits
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

    console.log();
    console.log(`Done. Removed ${totalDeleted} non-allowed-country trials.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
