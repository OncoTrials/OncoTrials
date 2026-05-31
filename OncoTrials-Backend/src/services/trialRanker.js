// trialRanker.js — Stage 1 SQL prefilter + Stage 2 rule-based ranking.
//
//   1. Pull a manageable candidate set (~hundreds) from Supabase using
//      structured filters that match the patient profile.
//   2. Run the rule-based EligibilityMatcher on each candidate, sort by score.
//   3. (PR 2) AI explainer over the top N. Not in this file yet.
//
// We deliberately keep Stage 1 forgiving: better to overshoot on candidates and
// let Stage 2's scoring narrow it down than to miss a valid trial because of an
// over-tight WHERE clause. Stage 1 is also the only stage that ever touches
// Supabase, so the rest of the pipeline is pure JS over an in-memory array.

const supabase = require('../db/supabaseClient');
const EligibilityMatcher = require('./eligibilityMatcher');
const { explainOnePair } = require('./llm');
const { confidenceToScore } = require('./llm/prompts/trialMatchExplainer');
const { getAllTrialsCached, warmAllTrialsCache } = require('./trialsCache');

const PREFILTER_LIMIT  = 500;     // hard cap — Stage 2 chews JS on this set
const TOP_RANK_LIMIT   = 20;      // returned to caller
const AI_EXPLAIN_LIMIT = 10;      // top N that get the AI rationale (cost control)

// PostgREST encodes `.in('id', [uuid1, uuid2, ...])` as a query-string filter
// `id=in.("uuid1","uuid2",...)`. With ~39 chars per quoted UUID + comma, 500
// ids puts the request URL over Supabase's ~16KB HTTP header limit and the
// API rejects it (`UND_ERR_HEADERS_OVERFLOW`). Chunk to ~200 ids per round-
// trip, run in parallel, flatten the result.
const IN_QUERY_CHUNK_SIZE = 200;

// Final relevance score weighting: rule matcher is the primary signal, AI
// confidence is a modifier. See plan §5.3.
const RULE_WEIGHT = 0.7;
const AI_WEIGHT   = 0.3;

// ClinicalTrials.gov v2 API returns statuses in SCREAMING_SNAKE_CASE; that's
// also what our importer stores. Earlier I had Title-Case here, which matched
// zero rows — that was the silent root cause of "0 candidates considered" on
// every match request.
const OPEN_STATUSES = [
    'RECRUITING',
    'NOT_YET_RECRUITING',
    'ENROLLING_BY_INVITATION',
];

// Columns Stage 2 needs. Avoid the heavy `eligibility_criteria` long-text field
// unless we have to fall back to it; the cleaner JSON usually has what we want.
const RANK_COLUMNS = [
    'id', 'nct_id', 'title', 'summary', 'status', 'sponsor',
    'conditions', 'sex', 'minimum_age', 'maximum_age',
    'biomarker_criteria', 'study_description',
    'eligibility_summary_clinician_json',
    'location_city', 'location_state', 'location_country',
    'latitude', 'longitude',
    'start_date', 'primary_completion_date', 'completion_date',
].join(', ');

/**
 * Rank trials for a patient.
 *
 * Stage 1 (SQL prefilter) + Stage 2 (rule matcher) always run. Stage 3 (AI
 * explainer) runs on the top N viable results when `withAi` is true AND the
 * org has consented to LLM use; otherwise the rule-based rationale is used.
 *
 * @param {object} patient  Internal patient shape (see EligibilityMatcher).
 * @param {object} [opts]
 * @param {number} [opts.limit=20]                  Number of ranked results to return.
 * @param {boolean} [opts.withAi=true]              Run Stage 3 AI explainer.
 * @param {string|null} [opts.orgId=null]           Org bucket for cost-guard counters.
 * @param {number|null} [opts.orgCapUsd=null]       Override default per-org daily cap.
 * @param {string|null} [opts.providerName=null]    Override default LLM provider.
 * @returns {Promise<{candidates_considered:number, ai_provider:string|null, ai_model:string|null, results:Array}>}
 */
async function rankTrialsForPatient(patient, opts = {}) {
    const limit  = Math.min(Math.max(opts.limit ?? TOP_RANK_LIMIT, 1), TOP_RANK_LIMIT);
    const withAi = opts.withAi !== false;

    const candidates = await stage1Prefilter(patient);

    // Stage 2 — rule match + sort
    const scored = candidates.map((trial) => {
        const match = EligibilityMatcher.evaluatePatientAgainstTrial(patient, trial);
        return { trial, match };
    });

    // Knock out hard "not eligible" results before ranking — they shouldn't
    // crowd the top of the list even if their raw score is mid-range.
    const viable = scored
        .filter(({ match }) => match.status !== EligibilityMatcher.STATUS.NOT_ELIGIBLE)
        .sort((a, b) => b.match.score - a.match.score);

    const top = viable.slice(0, limit);

    // Stage 3 — AI explainer (only on first AI_EXPLAIN_LIMIT of the top set).
    // Runs in parallel; each call has its own timeout + fallback inside
    // explainOnePair, so a slow / failed call does not block the others.
    let aiProvider = null;
    let aiModel    = null;

    if (withAi && top.length > 0) {
        // De-identified summary of what we're handing to the LLM. Useful for
        // debugging "AI thinks patient is 115" type issues — paste this log
        // line into the next bug report. Contains no PHI (no name/MRN/DOB).
        console.log(`[trialRanker] stage3 patient sent to LLM: age=${patient.age} gender=${patient.gender} cancerType="${patient.cancerType}" stage=${patient.cancerStage ?? 'null'} biomarker=${patient.mutationBiomarker ?? 'null'} ecog=${patient.ecog ?? 'null'} priorLines=${patient.lineOfTreatment ?? 'null'}`);

        const aiSlice = top.slice(0, AI_EXPLAIN_LIMIT);
        const aiResults = await Promise.all(
            aiSlice.map(({ trial }) => explainOnePair(patient, trial, {
                orgId:        opts.orgId ?? null,
                orgCapUsd:    opts.orgCapUsd ?? null,
                providerName: opts.providerName ?? null,
            }))
        );

        // Attach AI output back to each top-N entry; entries past AI_EXPLAIN_LIMIT
        // keep the pure rule rationale.
        for (let i = 0; i < aiSlice.length; i++) {
            aiSlice[i].ai = aiResults[i];
        }

        // Report provider/model based on the first successful call (they're
        // all the same provider in v1).
        const firstOk = aiResults.find((r) => r.ok);
        if (firstOk) {
            aiProvider = firstOk.provider;
            aiModel    = firstOk.model;
        } else if (aiResults.length > 0) {
            // Even if all failed, surface what we *tried* so the response is
            // self-documenting.
            aiProvider = aiResults[0].provider;
            aiModel    = aiResults[0].model;
        }
    }

    // Filter out trials the AI explicitly tagged as not disease-relevant.
    // `disease_match === 'no'` means the AI judged the trial studies a
    // different disease entirely; we drop those rather than rank them.
    // Trials past AI_EXPLAIN_LIMIT keep `ai === undefined` and pass through.
    const aiRelevant = top.filter(({ ai }) => !ai || !ai.ok || ai.explanation?.disease_match !== 'no');

    // Re-rank: now that disease-irrelevant trials are gone, rebuild the
    // index so #1 is the best of what's left.
    const finalTop = aiRelevant.slice(0, limit);

    const results = finalTop.map(({ trial, match, ai }, idx) => formatRankedResult(trial, match, idx, ai));

    return {
        candidates_considered: candidates.length,
        ai_provider: aiProvider,
        ai_model:    aiModel,
        results,
    };
}

// ---- Stage 1: Redis-cache prefilter (Supabase fallback) ------------------
//
// Why cache-first: the `trials` table has no trigram index on title/summary
// (yet). With a tight keyword like "prostate", PostgreSQL has to seq-scan
// the whole table to evaluate `title ILIKE '%prostate%' OR summary ILIKE
// '%prostate%' LIMIT 500`, which blows past the statement timeout. The
// chunked Redis cache holds the full corpus in JS-readable form — we filter
// in-memory (sub-second on 24K rows) then hit Supabase once by primary key
// to pull the Stage 2 columns the cache doesn't carry.
//
// Falls back to a direct Supabase query only when the cache is cold AND
// can't be warmed; that path may still time out, in which case the operator
// needs to run the importer or add a trigram index (see SQL in PR notes).

async function stage1Prefilter(patient) {
    let cached = await getAllTrialsCached();
    if (!cached?.data) {
        console.warn('[trialRanker] stage1 cache cold; warming on-demand');
        try {
            await warmAllTrialsCache();
            cached = await getAllTrialsCached();
        } catch (warmErr) {
            console.error('[trialRanker] cache warm failed; falling back to Supabase ILIKE:', warmErr?.message || warmErr);
        }
    }

    if (cached?.data) {
        return stage1FromCache(patient, cached.data);
    }
    return stage1FromSupabase(patient);
}

// In-memory filter over the cached corpus, then a single id-keyed Supabase
// fetch to pull the Stage-2 columns the cache doesn't store
// (eligibility_summary_clinician_json, study_description).
async function stage1FromCache(patient, allTrials) {
    const gender = patient?.gender ? String(patient.gender).trim().toUpperCase() : null;
    const keywords = patient?.cancerType
        ? EligibilityMatcher.extractCancerKeywords(patient.cancerType)
        : [];

    console.log(`[trialRanker] stage1 cancer keywords: [${keywords.join(', ')}]`);

    const matchedIds = [];
    for (const trial of allTrials) {
        if (!OPEN_STATUSES.includes(trial.status)) continue;

        if (gender && trial.sex && trial.sex !== 'ALL' && trial.sex !== gender) continue;

        if (keywords.length > 0) {
            const conditionsText = Array.isArray(trial.conditions) ? trial.conditions.join(' ') : '';
            const haystack = `${trial.title || ''} ${trial.summary || ''} ${conditionsText}`.toLowerCase();
            if (!keywords.some((kw) => haystack.includes(kw))) continue;
        }

        matchedIds.push(trial.id);
        if (matchedIds.length >= PREFILTER_LIMIT) break;
    }

    console.log(`[trialRanker] stage1 cache-filtered ${matchedIds.length}/${allTrials.length} trials`);
    if (matchedIds.length === 0) return [];

    // Fetch full Stage 2 columns by primary key — uses the id index, fast.
    // Chunked because PostgREST puts the id list in the URL and 500 UUIDs
    // overflow Supabase's 16KB header limit.
    return fetchTrialsByIdsChunked(matchedIds);
}

async function fetchTrialsByIdsChunked(ids) {
    const chunks = [];
    for (let i = 0; i < ids.length; i += IN_QUERY_CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + IN_QUERY_CHUNK_SIZE));
    }

    const pages = await Promise.all(chunks.map(async (chunkIds) => {
        const { data, error } = await supabase
            .from('trials')
            .select(RANK_COLUMNS)
            .in('id', chunkIds);
        if (error) {
            const err = new Error(`Stage 1 fetch-by-ids failed: ${error.message}`);
            err.cause = error;
            throw err;
        }
        return data ?? [];
    }));

    return pages.flat();
}

// Direct Supabase prefilter — kept as a fallback for when the Redis cache
// is unreachable. Slow on tight keywords until a trigram index exists.
async function stage1FromSupabase(patient) {
    let query = supabase
        .from('trials')
        .select(RANK_COLUMNS)
        .in('status', OPEN_STATUSES)
        .limit(PREFILTER_LIMIT);

    if (patient?.gender) {
        const g = String(patient.gender).trim().toUpperCase();
        query = query.or(`sex.is.null,sex.eq.ALL,sex.eq.${g}`);
    }

    if (patient?.cancerType) {
        const keywords = EligibilityMatcher.extractCancerKeywords(patient.cancerType);
        if (keywords.length > 0) {
            const orClauses = [];
            for (const kw of keywords) {
                orClauses.push(`title.ilike.%${kw}%`);
                orClauses.push(`summary.ilike.%${kw}%`);
            }
            query = query.or(orClauses.join(','));
            console.log(`[trialRanker] stage1 cancer keywords: [${keywords.join(', ')}] (supabase fallback)`);
        } else {
            const safe = String(patient.cancerType).trim().replace(/[,()]/g, ' ');
            query = query.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`);
            console.log(`[trialRanker] stage1 cancer keywords: <none — using raw "${safe}"> (supabase fallback)`);
        }
    }

    const { data, error } = await query;
    if (error) {
        const err = new Error(`Stage 1 prefilter failed: ${error.message}`);
        err.cause = error;
        throw err;
    }

    console.log(`[trialRanker] stage1 supabase-fallback returned ${data?.length ?? 0} candidates`);
    return data ?? [];
}

// ---- Result formatting ----------------------------------------------------

function formatRankedResult(trial, match, index, aiResult) {
    const aiOk = aiResult && aiResult.ok;
    const aiExp = aiOk ? aiResult.explanation : null;

    // Final relevance score: blend rule score with AI confidence when we have
    // a successful AI call; otherwise fall back to the rule score unmodified.
    const relevanceScore = aiOk
        ? Math.round(RULE_WEIGHT * match.score + AI_WEIGHT * confidenceToScore(aiExp.confidence))
        : match.score;

    // Reconcile the rule-based status with what the AI saw. The rule matcher
    // can't read free-text exclusion criteria; the AI can. If the AI flagged
    // exclusions or rated disease match only "partial", downgrade so the
    // result badge doesn't claim Eligible when the AI thinks otherwise.
    let effectiveStatus = match.status;
    if (aiOk) {
        if (aiExp.disease_match === 'partial' && effectiveStatus === EligibilityMatcher.STATUS.LIKELY_ELIGIBLE) {
            effectiveStatus = EligibilityMatcher.STATUS.NEEDS_REVIEW;
        }
        if (aiExp.relevant_exclusions.length > 0
            && (effectiveStatus === EligibilityMatcher.STATUS.ELIGIBLE
                || effectiveStatus === EligibilityMatcher.STATUS.LIKELY_ELIGIBLE)) {
            effectiveStatus = EligibilityMatcher.STATUS.NEEDS_REVIEW;
        }
    }

    return {
        rank:            index + 1,
        relevance_score: relevanceScore,
        rule_score:      match.score,
        rule_status:     effectiveStatus,
        ai_disease_match: aiOk ? aiExp.disease_match : null,
        ai_confidence:   aiOk ? aiExp.confidence : null,
        ai_fallback_reason: aiResult && !aiResult.ok ? aiResult.reason : null,
        nct_id:          trial.nct_id,
        title:           trial.title,
        status:          trial.status,
        sponsor:         trial.sponsor,
        conditions:      trial.conditions,
        summary:         trial.summary,
        location: {
            city:      trial.location_city,
            state:     trial.location_state,
            country:   trial.location_country,
            latitude:  trial.latitude,
            longitude: trial.longitude,
        },
        dates: {
            start:              trial.start_date,
            primary_completion: trial.primary_completion_date,
            completion:         trial.completion_date,
        },
        // Prefer the AI rationale when available; otherwise the rule summary.
        rationale: aiOk
            ? aiExp.rationale
            : buildRuleRationale(match),
        matched_inclusion:   aiOk ? aiExp.matched_inclusion   : (match.reasons.met_inclusion    ?? []),
        unmet_inclusion:     aiOk ? aiExp.unmet_inclusion     : (match.reasons.failed_inclusion ?? []),
        relevant_exclusions: aiOk ? aiExp.relevant_exclusions : (match.reasons.triggered_exclusion ?? []),
        match_breakdown:     match.reasons,
    };
}

function buildRuleRationale(match) {
    const met = match.reasons.met_inclusion ?? [];
    if (met.length === 0) {
        return 'Trial matched the patient profile on basic criteria; review the breakdown for details.';
    }
    return met.slice(0, 2).join(' ');
}

module.exports = {
    rankTrialsForPatient,
    // Exported for tests / debugging
    _stage1Prefilter: stage1Prefilter,
    PREFILTER_LIMIT,
    TOP_RANK_LIMIT,
};
