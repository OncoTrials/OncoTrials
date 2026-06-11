// trialsCache.js — single source of truth for the "all trials" Redis cache.
//
//   • The cache key `trials:all` holds the entire trial corpus as one JSON
//     payload. Reads from /trials?limit=all serve directly from here.
//   • The importer (run_import.js) is responsible for keeping it fresh. After
//     every successful import that changed something, the importer calls
//     warmAllTrialsCache(), which paginates Supabase once and overwrites the
//     key atomically.
//   • Pagination uses **keyset** (cursor on `id`), not OFFSET. Each page is
//     O(log n) with an indexed lookup; previously OFFSET 23000+ was forcing
//     PostgreSQL to scan past every prior row.
//   • TTL is long (7 days) but the importer overwrites before then. The TTL
//     is just a safety net so a stale cache can't outlive the import schedule
//     indefinitely.
//
// Why a single big blob and not per-trial hash entries:
//   • Reads serve all 24K rows in one Redis GET (~25 ms). Per-trial would
//     need HGETALL → still one command but more memory overhead per entry.
//   • Writes are infrequent (1-12 times per day, only by the importer).
//   • Atomic replacement is trivial — a single SET. No risk of partial
//     visibility during refresh.

const supabase = require('../db/supabaseClient');
const { redis } = require('../db/redisClient');

const ALL_META_KEY         = 'trials:all:meta';
const ALL_CHUNK_KEY_PREFIX = 'trials:all:chunk:';
const ALL_CACHE_TTL_SEC    = 7 * 24 * 60 * 60;   // 7 days; importer should refresh before this
const SUPABASE_PAGE        = 1000;                // PostgREST default per-response cap
const CACHE_VERSION_KEY    = 'trials:cache_version';

// Chunked cache: split the corpus into N rows per chunk so each Redis value
// stays under Upstash's per-request size limit AND each JSON.stringify
// allocation stays small enough to fit in a constrained Node heap.
//
// Sizing math (assume ~1.7 KB JSON per row):
//   1000 rows ≈ 1.7 MB per chunk → may exceed Upstash Free's 1 MB request cap
//    500 rows ≈ 850 KB per chunk → safe under Free, ~48 chunks for 24K corpus
//   2000 rows ≈ 3.4 MB per chunk → only safe on Pay-as-you-go (10 MB cap)
//
// Default 500 is the safest. Bump via env var if you're on paid Upstash and
// want fewer commands per warm/read (free-tier commands/day cap = 10K).
const CHUNK_ROWS = Number(process.env.TRIALS_CACHE_CHUNK_ROWS) || 500;

// Columns served by the `?limit=all` payload. Kept identical to the per-page
// LIST_COLUMNS in trials.js so callers see the same shape regardless of which
// endpoint variant they hit.
const LIST_COLUMNS = [
    'id', 'nct_id', 'title', 'status', 'sponsor',
    'summary', 'conditions', 'sex', 'minimum_age', 'maximum_age',
    'location_city', 'location_state', 'location_country',
    'latitude', 'longitude', 'start_date', 'primary_completion_date',
    'completion_date', 'eligibility_criteria_summary', 'biomarker_criteria', 'created_at',
].join(', ');

// ------------------------------------------------------------------ paging

/**
 * Keyset pagination on `id`. Walks the trials table in id order and returns
 * the entire corpus. Each page is an indexed lookup; total time scales
 * linearly in row count, not quadratically (which is what OFFSET would give
 * us once the cursor walked past tens of thousands of rows).
 *
 * Returns trials sorted by `created_at DESC` (matching the per-page handler's
 * order) — we do the sort in-memory after collection since keyset pagination
 * required us to order by id during fetch.
 */
async function fetchAllTrialsFromSupabase() {
    const all = [];
    let cursorId = null;
    let pages = 0;
    const startedAt = Date.now();

    while (true) {
        const pageStartedAt = Date.now();
        let q = supabase
            .from('trials')
            .select(LIST_COLUMNS)
            .order('id', { ascending: true })
            .limit(SUPABASE_PAGE);
        if (cursorId) q = q.gt('id', cursorId);

        const { data, error } = await q;
        if (error) {
            throw new Error(`trialsCache.fetchAll failed at page ${pages + 1}: ${error.message}`);
        }
        if (!data || data.length === 0) break;

        all.push(...data);
        cursorId = data[data.length - 1].id;
        pages += 1;

        console.log(`[trialsCache] page ${pages}: ${data.length} rows in ${Date.now() - pageStartedAt}ms (total so far: ${all.length})`);

        if (data.length < SUPABASE_PAGE) break;
    }

    // Restore the display order callers expect.
    all.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    console.log(`[trialsCache] paginated ${all.length} trials in ${pages} pages, ${Date.now() - startedAt}ms`);
    return all;
}

// ----------------------------------------------------------------- caching

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Read the chunked cache. Returns null on cold/partial cache (missing meta or
 * any missing chunk → treat as miss; caller should re-warm).
 *
 * Reads happen in parallel: one for the meta key, then `meta.chunkCount`
 * parallel GETs for each chunk. Each chunk is ~7-8 MB JSON; the full
 * concatenation needs ~40 MB of heap on the read side, so the caller's
 * container needs enough memory (see deployment notes).
 */
async function getAllTrialsCached() {
    const meta = await redis.get(ALL_META_KEY);
    if (!meta || typeof meta.chunkCount !== 'number') return null;

    const chunkPromises = [];
    for (let i = 0; i < meta.chunkCount; i++) {
        chunkPromises.push(redis.get(`${ALL_CHUNK_KEY_PREFIX}${i}`));
    }
    const chunks = await Promise.all(chunkPromises);
    if (chunks.some((c) => c == null)) {
        console.warn(`[trialsCache] chunked cache is partial (${chunks.filter((c) => c != null).length}/${meta.chunkCount} chunks present); treating as miss`);
        return null;
    }

    const data = chunks.flat();
    return { data, total: data.length, page: 1, limit: 'all' };
}

/**
 * Re-paginate Supabase and overwrite the chunked cache. Called by the
 * importer after a successful run, and as a lazy fallback by the
 * /trials?limit=all handler on cold cache.
 *
 * Write order matters: chunks first, meta last. A reader that arrives mid-
 * warm sees the OLD meta and either reads the old chunks (still present
 * until overwritten) or — once we DEL the old chunks above the new
 * chunkCount — sees a partial cache and treats it as a miss (next request
 * triggers a re-warm). The race window is small and self-healing.
 */
async function warmAllTrialsCache() {
    const startedAt = Date.now();
    const all = await fetchAllTrialsFromSupabase();
    const chunks = chunkArray(all, CHUNK_ROWS);

    try {
        // Write all chunks in parallel. Each is its own JSON.stringify
        // allocation (~7-8 MB), bounded so we don't try to serialize the
        // entire corpus as a single string.
        await Promise.all(
            chunks.map((chunk, i) =>
                redis.set(`${ALL_CHUNK_KEY_PREFIX}${i}`, chunk, { ex: ALL_CACHE_TTL_SEC })
            )
        );

        // Delete any chunk keys above the new chunkCount (corpus shrunk).
        // Bounded loop: at most ~10 deletes even for very large shrinks.
        const oldMeta = await redis.get(ALL_META_KEY);
        const oldChunkCount = (oldMeta && typeof oldMeta.chunkCount === 'number') ? oldMeta.chunkCount : 0;
        for (let i = chunks.length; i < oldChunkCount; i++) {
            await redis.del(`${ALL_CHUNK_KEY_PREFIX}${i}`);
        }

        // Write meta LAST so readers see a consistent snapshot.
        const meta = {
            totalCount:  all.length,
            chunkCount:  chunks.length,
            chunkSize:   CHUNK_ROWS,
            generatedAt: new Date().toISOString(),
        };
        await redis.set(ALL_META_KEY, meta, { ex: ALL_CACHE_TTL_SEC });

        console.log(`[trialsCache] warmed ${all.length} trials into ${chunks.length} Redis chunks (chunk size ${CHUNK_ROWS}) in ${Date.now() - startedAt}ms`);
        return all.length;
    } catch (err) {
        // Don't let a Redis write failure crash the importer — the old cache
        // (if any) is preserved because we delete-old-chunks BEFORE writing
        // meta last, and the meta atomically replaces the snapshot.
        console.error(`[trialsCache] warm failed after pagination (${all.length} trials fetched): ${err?.message || err}`);
        throw err;
    }
}

// ------------------------------------------------------- version utilities

/**
 * Read the current cache version. Used by the per-page /trials handler
 * and by /api/v1/match (so a cache-version bump on import invalidates both
 * the trial list cache AND any stale match-result cache built against the
 * old corpus).
 */
async function getCacheVersion() {
    const v = await redis.get(CACHE_VERSION_KEY);
    return v ? String(v) : '1';
}

async function bumpCacheVersion(reason) {
    try {
        const next = await redis.incrBy(CACHE_VERSION_KEY, 1);
        console.log(`[trialsCache] cache version bumped → ${next} (reason: ${reason})`);
        return next;
    } catch (err) {
        console.error('[trialsCache] cache version bump failed (continuing):', err?.message || err);
        return null;
    }
}

module.exports = {
    ALL_META_KEY,
    ALL_CHUNK_KEY_PREFIX,
    ALL_CACHE_TTL_SEC,
    LIST_COLUMNS,
    CHUNK_ROWS,
    fetchAllTrialsFromSupabase,
    warmAllTrialsCache,
    getAllTrialsCached,
    getCacheVersion,
    bumpCacheVersion,
};
