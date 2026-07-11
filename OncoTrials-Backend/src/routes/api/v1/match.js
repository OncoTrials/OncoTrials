// POST /api/v1/match — rank trials for a patient.
//
//   Stage 1 SQL prefilter → Stage 2 rule matcher → Stage 3 AI explainer.
//
// 24h result cache: identical patient state under the same org hits the cached
// response and skips both Supabase and the LLM. Bypass with `?refresh=1`.
//
// Auth: Supabase JWT (PR 1). SMART session JWT layers in via PR 3 — same
// middleware path. External API keys arrive in PR 4.
//
// Body shape:
//   {
//     "patient": {
//       "age":               42,
//       "gender":            "female",
//       "cancerType":        "HER2+ breast cancer",
//       "cancerStage":       "stage iv",
//       "mutationBiomarker": "HER2",
//       "ecog":              1,
//       "lineOfTreatment":   2,
//       "patientRef":        "<opaque caller-side ID>"   // optional; hashed for audit
//     },
//     "limit":       20,            // optional, 1..20
//     "aiProvider":  "openai"       // optional; defaults to env DEFAULT_LLM_PROVIDER
//   }
//
// Org membership is resolved SERVER-SIDE (SMART JWT claim, or the caller's
// email domain against organizations.valid_domains). A body-supplied orgId is
// ignored — it previously allowed consent bypass and cross-org budget burn.

const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const supabase = require('../../../db/supabaseClient');
const { redis } = require('../../../db/redisClient');
const { requireAuth } = require('../../../middleware/auth');
const { rankTrialsForPatient } = require('../../../services/trialRanker');
const fhirContextStore = require('../../../services/fhirContextStore');
const { ipRateLimit, subjectRateLimit } = require('../../../middleware/rateLimit');
const { findOrgForEmail } = require('../../../services/domainVerification');
const { getCacheVersion: getTrialsCacheVersion } = require('../../../services/trialsCache');

const MAX_LIMIT             = 20;
const RESULT_CACHE_TTL_SEC  = 24 * 60 * 60;
const PEPPER                = process.env.PATIENT_HASH_PEPPER || '';

// ---- Patient validation -------------------------------------------------

// Length caps: these strings flow into the LLM prompt and back out in the
// response. Unbounded input means unbounded token spend and log inflation.
const MAX_FIELD_CHARS   = 200;
const MAX_THERAPIES     = 10;

const capStr = (v) => (typeof v === 'string' ? v.slice(0, MAX_FIELD_CHARS) : null);

// Validates AND sanitizes: only whitelisted fields survive, so a caller can't
// smuggle arbitrary extra fields into the LLM prompt or the audit trail.
function validatePatient(body) {
    const errors = [];
    const p = body?.patient;
    if (!p || typeof p !== 'object') {
        return { errors: ['`patient` object is required'] };
    }

    if (p.age != null) {
        const n = Number(p.age);
        if (!Number.isFinite(n) || n < 0 || n > 120) errors.push('patient.age must be 0-120');
    }
    if (p.gender != null && !['male', 'female', 'other', 'all'].includes(String(p.gender).toLowerCase())) {
        errors.push('patient.gender must be male/female/other/all');
    }
    if (p.ecog != null) {
        const n = Number(p.ecog);
        if (!Number.isFinite(n) || n < 0 || n > 5) errors.push('patient.ecog must be 0-5');
    }
    if (p.lineOfTreatment != null) {
        const n = Number(p.lineOfTreatment);
        if (!Number.isFinite(n) || n < 0) errors.push('patient.lineOfTreatment must be a non-negative number');
    }
    if (!p.cancerType || typeof p.cancerType !== 'string' || !p.cancerType.trim()) {
        errors.push('patient.cancerType is required');
    }
    if (errors.length > 0) return { errors };

    const patient = {
        age:               p.age != null ? Number(p.age) : null,
        gender:            capStr(p.gender),
        cancerType:        capStr(p.cancerType),
        cancerStage:       capStr(p.cancerStage),
        mutationBiomarker: capStr(p.mutationBiomarker),
        ecog:              p.ecog != null ? Number(p.ecog) : null,
        lineOfTreatment:   p.lineOfTreatment != null ? Number(p.lineOfTreatment) : null,
        patientRef:        capStr(p.patientRef),
        priorTherapies:    Array.isArray(p.priorTherapies)
            ? p.priorTherapies.slice(0, MAX_THERAPIES).map((t) => String(t).slice(0, MAX_FIELD_CHARS))
            : [],
    };

    return { errors, patient };
}

// ---- Audit helpers ------------------------------------------------------

// Deterministic, non-reversible. Stable across Cloud Run instances as long as
// PATIENT_HASH_PEPPER is the same. Without it set, hashes are still per-row
// stable but not cross-deployment stable — set in prod for duplicate-detection
// to work consistently.
function hashPatientForAudit(patient) {
    const stable = JSON.stringify({
        ref:        patient.patientRef ?? null,
        age:        patient.age ?? null,
        gender:     (patient.gender ?? '').toLowerCase(),
        cancerType: (patient.cancerType ?? '').toLowerCase().trim(),
        biomarker:  (patient.mutationBiomarker ?? '').toLowerCase().trim(),
    });
    return crypto.createHmac('sha256', PEPPER).update(stable).digest('hex');
}

// Signature of fields that meaningfully change the ranking result. If any of
// these change between calls for the same patient hash, we re-rank rather
// than returning the cached result.
function buildPrefilterSignature(patient) {
    const sig = JSON.stringify({
        ct:    (patient.cancerType ?? '').toLowerCase().trim(),
        age:   patient.age ?? null,
        sex:   (patient.gender ?? '').toLowerCase(),
        stage: (patient.cancerStage ?? '').toLowerCase().trim(),
        bm:    (patient.mutationBiomarker ?? '').toLowerCase().trim(),
        ecog:  patient.ecog ?? null,
        lot:   patient.lineOfTreatment ?? null,
    });
    return crypto.createHash('sha1').update(sig).digest('hex').slice(0, 16);
}

function buildCacheKey(orgId, patientHash, prefilterSig, trialsVersion) {
    // org_id in the key — never share results across orgs (plan §6.7).
    // trialsVersion in the key — when the importer refreshes the trial corpus,
    // the version bumps and all prior match results are automatically orphaned.
    // Without this, the match cache would serve stale results that don't
    // include newly imported trials (or, worse, include trials that have since
    // been removed).
    return `match:t${trialsVersion}:${orgId ?? 'anon'}:${patientHash}:${prefilterSig}`;
}

async function writeAuditRow(row) {
    // Best-effort: never block the response on the audit write. We surface
    // failures to logs so they can be investigated, but the caller still
    // gets their ranked results.
    try {
        const { error } = await supabase.from('match_requests').insert(row);
        if (error) console.error('match_requests insert failed:', error.message);
    } catch (err) {
        console.error('match_requests insert threw:', err);
    }
}

// ---- Org resolution + consent/budget lookup -----------------------------

// Which org does this caller belong to? NEVER read from the request body —
// a caller-supplied orgId could bypass another org's AI consent, drain its
// LLM budget, and poison org-scoped cache keys. SMART launches carry the org
// in the session JWT (mapped from `iss` at callback time); Supabase users are
// resolved from their email domain.
async function resolveOrgId(user) {
    if (user?.source === 'smart_launch') return user.orgId ?? null;
    if (!user?.email) return null;
    try {
        const org = await findOrgForEmail(user.email);
        return org?.id ?? null;
    } catch (err) {
        console.error('resolveOrgId failed (treating as org-less):', err?.message || err);
        return null;
    }
}

// Returns { withAi, orgCapUsd }. Consent semantics:
//   - Caller bound to an org  → the org must have explicitly opted in
//     (ai_provider_consent = true). Lookup failure counts as NO consent —
//     for patient data, fail-safe means fail-closed.
//   - Org-less caller (no domain match / SMART launch before org mapping) →
//     platform default applies: AI on unless ALLOW_AI_WITHOUT_ORG=false.
async function loadOrgPolicy(orgId) {
    if (!orgId) {
        return { withAi: process.env.ALLOW_AI_WITHOUT_ORG !== 'false', orgCapUsd: null };
    }

    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('ai_provider_consent, daily_llm_budget_usd')
            .eq('id', orgId)
            .single();
        if (error || !data) {
            console.error('loadOrgPolicy lookup failed; disabling AI for this request:', error?.message);
            return { withAi: false, orgCapUsd: null };
        }
        return {
            withAi:    data.ai_provider_consent === true,
            orgCapUsd: data.daily_llm_budget_usd ?? null,
        };
    } catch (err) {
        console.error('loadOrgPolicy failed; disabling AI for this request:', err);
        return { withAi: false, orgCapUsd: null };
    }
}

// ---- Route --------------------------------------------------------------

router.post('/', ipRateLimit, requireAuth, subjectRateLimit, async (req, res) => {
    const startedAt = Date.now();

    // Two patient-input paths:
    //   1. SMART launch — the session JWT carries a request-id that points at
    //      the normalized Patient we cached during /fhir/callback. The body's
    //      `patient` field is ignored (we'd rather trust EHR data than caller
    //      input on a clinician-facing flow).
    //   2. Supabase / external JWT — the patient comes from the request body.
    let patient;
    if (req.user?.source === 'smart_launch' && req.user?.requestId) {
        const cached = await fhirContextStore.take(req.user.requestId);
        if (!cached) {
            return res.status(410).json({
                error: 'SMART launch context not found or already used. Re-launch from EPIC.',
            });
        }
        patient = cached;
    } else {
        const v = validatePatient(req.body);
        if (v.errors.length > 0) {
            return res.status(400).json({ error: 'Invalid request body', details: v.errors });
        }
        patient = v.patient;
    }

    // Cancer type is required regardless of source — fail fast. When the
    // caller is SMART, the cancer type came from FHIR; if it's missing,
    // /fhir/callback already logged the conditions it *did* see, so check
    // those logs to decide whether the patient really has no cancer or our
    // normalizer is missing a code mapping.
    if (!patient?.cancerType || !String(patient.cancerType).trim()) {
        return res.status(422).json({
            error: 'Patient cancer type could not be determined. Ranking requires a diagnosis.',
            hint:  req.user?.source === 'smart_launch'
                ? 'The patient\'s FHIR Condition resources contained no recognizable oncology diagnosis. Check Cloud Run logs for "[fhir/callback] no cancer condition matched" to see the conditions that were returned.'
                : 'Pass patient.cancerType (e.g. "HER2+ breast cancer") in the request body.',
        });
    }

    const requestedLimit = Math.min(Math.max(parseInt(req.body?.limit, 10) || MAX_LIMIT, 1), MAX_LIMIT);
    const orgId          = await resolveOrgId(req.user);   // server-derived; body orgId is ignored
    const providerName   = req.body?.aiProvider ?? null;
    const skipCache      = req.query?.refresh === '1';

    const patientHash   = hashPatientForAudit(patient);
    const prefilterSig  = buildPrefilterSignature(patient);
    const trialsVersion = await getTrialsCacheVersion();
    const cacheKey      = buildCacheKey(orgId, patientHash, prefilterSig, trialsVersion);

    // Cache hit?
    if (!skipCache) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                // Stamp the response with `cached: true` so callers can tell.
                // Don't write a new audit row for cache hits — the original
                // hit already produced one.
                return res.json({ ...cached, cached: true });
            }
        } catch (err) {
            console.error('result-cache lookup failed (continuing):', err);
        }
    }

    try {
        const policy = await loadOrgPolicy(orgId);

        const ranked = await rankTrialsForPatient(patient, {
            limit:        requestedLimit,
            withAi:       policy.withAi,
            orgId,
            orgCapUsd:    policy.orgCapUsd,
            providerName,
        });

        const requestId = crypto.randomUUID();
        const response = {
            request_id:   requestId,
            patient_hash: patientHash,
            matched_at:   new Date().toISOString(),
            ai_provider:  ranked.ai_provider,
            ai_model:     ranked.ai_model,
            // False when one or more AI vetting calls failed this run (the
            // result is rule-only for those trials and was not cached).
            ai_complete:  ranked.ai_complete,
            candidates_considered: ranked.candidates_considered,
            // De-identified patient summary echoed back so the frontend can
            // render a header card without making a second request. Same
            // fields the AI explainer sees — no name, MRN, DOB, address.
            patient: {
                age:               patient.age ?? null,
                gender:            patient.gender ?? null,
                cancerType:        patient.cancerType ?? null,
                cancerStage:       patient.cancerStage ?? null,
                mutationBiomarker: patient.mutationBiomarker ?? null,
                ecog:              patient.ecog ?? null,
                lineOfTreatment:   patient.lineOfTreatment ?? null,
            },
            results:      ranked.results,
            cached:       false,
        };

        // Cache the response for 24h — but only when the run was complete
        // (every returned trial AI-vetted, or AI off by policy). A run
        // degraded by LLM timeouts or cost caps is a worse answer than a
        // fresh retry, so we never freeze one in the cache. Key already
        // scopes to org + patient criteria + trials-corpus version, so a
        // hit means "same patient, same criteria, same trial data".
        if (ranked.ai_complete) {
            try {
                await redis.set(cacheKey, response, { ex: RESULT_CACHE_TTL_SEC });
            } catch (err) {
                console.error('result-cache write failed (continuing):', err);
            }
        } else {
            console.warn('[match] skipping result-cache write: AI vetting incomplete for this run');
        }

        // Fire-and-forget audit write
        writeAuditRow({
            id:           requestId,
            org_id:       orgId,
            user_id:      req.user?.id ?? null,
            patient_hash: patientHash,
            source:       req.user?.source ?? 'supabase_jwt',
            ai_provider:  ranked.ai_provider,
            ai_model:     ranked.ai_model,
            trial_count:  ranked.results.length,
            duration_ms:  Date.now() - startedAt,
            cost_usd_est: 0,    // populated later from the AI results sum; PR 2.5 polish
        });

        return res.json(response);
    } catch (err) {
        console.error('match request failed:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
