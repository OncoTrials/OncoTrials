// trialRanker.js — Stage 1 SQL prefilter + Stage 2 rule-based ranking.
//
// Pipeline (see epic-fhir-integration-plan.md §4):
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

const PREFILTER_LIMIT  = 500;     // hard cap — Stage 2 chews JS on this set
const TOP_RANK_LIMIT   = 20;      // returned to caller
const AI_EXPLAIN_LIMIT = 10;      // top N that get the AI rationale (cost control)

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

    const results = top.map(({ trial, match, ai }, idx) => formatRankedResult(trial, match, idx, ai));

    return {
        candidates_considered: candidates.length,
        ai_provider: aiProvider,
        ai_model:    aiModel,
        results,
    };
}

// ---- Stage 1: SQL prefilter ----------------------------------------------

async function stage1Prefilter(patient) {
    let query = supabase
        .from('trials')
        .select(RANK_COLUMNS)
        .in('status', OPEN_STATUSES)
        .limit(PREFILTER_LIMIT);

    // Sex filter: include trials that don't restrict, plus the patient's sex.
    // Trial sex is stored uppercase ('ALL' / 'MALE' / 'FEMALE') by the importer.
    // Patient gender from FHIR is lowercase ('male' / 'female'); uppercase it
    // so .eq.<gender> matches exactly.
    if (patient?.gender) {
        const g = String(patient.gender).trim().toUpperCase();
        query = query.or(`sex.is.null,sex.eq.ALL,sex.eq.${g}`);
    }

    // Cancer type matching — uses EligibilityMatcher.extractCancerKeywords so
    // Stage 1 and Stage 2 agree on what "related" means.
    //
    // Why keywords and not the whole string: FHIR sources (Synthea, real EPIC)
    // express diagnoses in SNOMED terms — "Neoplasm of prostate", "Malignant
    // neoplasm of breast (disorder)". ClinicalTrials.gov uses lay terms —
    // "Prostate Cancer", "HER2+ Breast Cancer". Exact-phrase ILIKE finds
    // nothing across that gap; keyword OR matching does.
    if (patient?.cancerType) {
        const keywords = EligibilityMatcher.extractCancerKeywords(patient.cancerType);
        if (keywords.length > 0) {
            // Build one OR clause per keyword × per searchable column.
            const orClauses = [];
            for (const kw of keywords) {
                // PostgREST .or() requires comma-separated key.op.value tuples.
                // ilike values are URL-safe except for commas and parens; our
                // extractor already stripped those.
                orClauses.push(`title.ilike.%${kw}%`);
                orClauses.push(`summary.ilike.%${kw}%`);
            }
            query = query.or(orClauses.join(','));
            console.log(`[trialRanker] stage1 cancer keywords: [${keywords.join(', ')}]`);
        } else {
            // Fallback: no keywords survived stopword filtering. Use the raw
            // string so the query is at least narrowed *somehow*.
            const safe = String(patient.cancerType).trim().replace(/[,()]/g, ' ');
            query = query.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`);
            console.log(`[trialRanker] stage1 cancer keywords: <none — using raw "${safe}">`);
        }
    }

    const { data, error } = await query;
    if (error) {
        const err = new Error(`Stage 1 prefilter failed: ${error.message}`);
        err.cause = error;
        throw err;
    }

    console.log(`[trialRanker] stage1 returned ${data?.length ?? 0} candidates for patient (cancerType="${patient?.cancerType ?? 'unknown'}", gender="${patient?.gender ?? 'unknown'}")`);
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

    return {
        rank:            index + 1,
        relevance_score: relevanceScore,
        rule_score:      match.score,
        rule_status:     match.status,
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
