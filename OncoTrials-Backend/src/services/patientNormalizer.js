// Maps a FHIR R4 patient bundle (as returned by fhirClient.fetchPatientBundle)
// into our internal `Patient` shape that EligibilityMatcher and the LLM prompt
// builder expect.
//
// This is the ONLY place FHIR → domain mapping happens. Keep it small and
// fixture-tested.
//
// Codes we look at (extend as we go):
//   - SNOMED CT  (cancer types in Condition.code)
//   - ICD-10-CM  (also used in Condition.code in some EPIC deployments)
//   - LOINC 89247-1  → ECOG performance status
//   - LOINC 21908-9  → cancer stage (Stage group)
//   - LOINC 81247-9  → genomic variant assessment (umbrella; biomarker hint)
//   - SNOMED 363346000 → Malignant neoplastic disease (umbrella code)

const ECOG_LOINC = '89247-1';
const STAGE_LOINC = '21908-9';

// Compute age as of `referenceDate` (defaults to today). Returns null if the
// result is outside a plausible 0–100 range — protects the matcher and LLM
// from being handed nonsense values when underlying data is corrupt or stale.
//
// The reference date is normally today. The CALLER may pass a different date
// in narrow dev/sandbox scenarios (see DEV_SANDBOX_AGE_FALLBACK in callback.js);
// production never overrides it.
function ageFromBirthDate(birthDate, referenceDate = null) {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return null;
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    if (Number.isNaN(ref.getTime())) return null;
    let age = ref.getUTCFullYear() - dob.getUTCFullYear();
    const m = ref.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && ref.getUTCDate() < dob.getUTCDate())) age -= 1;
    if (age < 0 || age > 100) {
        if (age > 100) {
            console.warn(`[patientNormalizer] computed age ${age} is implausible (birthDate=${birthDate}, refDate=${ref.toISOString().slice(0, 10)}); nulling.`);
        }
        return null;
    }
    return age;
}

function pickCancerType(conditions) {
    // Pick the most recent active cancer-related condition. Heuristic: any
    // condition with a code in a cancer hierarchy, sorted by recordedDate desc.
    // EPIC populates Condition.code.text with the human-readable diagnosis,
    // which is what we want to feed the matcher.
    const cancerLike = (conditions || []).filter(isCancerCondition);
    cancerLike.sort((a, b) => {
        const da = a.recordedDate ? Date.parse(a.recordedDate) : 0;
        const db = b.recordedDate ? Date.parse(b.recordedDate) : 0;
        return db - da;
    });
    const primary = cancerLike[0];
    if (!primary) return null;
    return primary.code?.text
        || primary.code?.coding?.[0]?.display
        || null;
}

function isCancerCondition(cond) {
    const codings = cond?.code?.coding || [];
    const text    = (cond?.code?.text || '').toLowerCase();
    if (/cancer|carcinoma|sarcoma|lymphoma|leukemia|melanoma|tumor|tumour|neoplasm/.test(text)) {
        return true;
    }
    return codings.some((c) => {
        const sys = (c.system || '').toLowerCase();
        const display = (c.display || '').toLowerCase();
        if (/cancer|carcinoma|sarcoma|lymphoma|leukemia|melanoma|tumor|neoplasm/.test(display)) return true;
        // SNOMED 'Malignant neoplastic disease' family — code starts vary.
        if (sys.includes('snomed') && /malignant/.test(display)) return true;
        return false;
    });
}

function pickCancerStage(conditions, observations) {
    // EPIC stores stage in two common places. Prefer the structured
    // Condition.stage[].summary, fall back to a stage-coded Observation.
    for (const c of conditions || []) {
        const stageText = c.stage?.[0]?.summary?.text
            || c.stage?.[0]?.summary?.coding?.[0]?.display;
        if (stageText) return stageText;
    }
    const stageObs = (observations || []).find((o) =>
        (o.code?.coding || []).some((c) => c.code === STAGE_LOINC)
    );
    if (stageObs) {
        return stageObs.valueCodeableConcept?.text
            || stageObs.valueCodeableConcept?.coding?.[0]?.display
            || stageObs.valueString
            || null;
    }
    return null;
}

function pickEcog(observations) {
    const ecogObs = (observations || []).find((o) =>
        (o.code?.coding || []).some((c) => c.code === ECOG_LOINC)
    );
    if (!ecogObs) return null;
    if (typeof ecogObs.valueInteger === 'number') return ecogObs.valueInteger;
    if (ecogObs.valueQuantity?.value != null)     return Number(ecogObs.valueQuantity.value);
    if (ecogObs.valueString) {
        const m = String(ecogObs.valueString).match(/[0-5]/);
        return m ? Number(m[0]) : null;
    }
    return null;
}

function pickBiomarker(observations) {
    // Look for known onco gene names in any genomic Observation's display text.
    // Conservative — we don't try to parse HGVS strings, that's a project on
    // its own. The matcher only needs a hint like "EGFR" or "HER2".
    const GENE_RE = /\b(EGFR|HER2|KRAS|NRAS|BRAF|ALK|ROS1|MET|RET|NTRK[123]?|PIK3CA|PTEN|TP53|KIT|PDGFRA)\b/i;
    for (const o of observations || []) {
        const text = JSON.stringify(o).match(GENE_RE);
        if (text) return text[0].toUpperCase();
    }
    return null;
}

function pickLineOfTreatment(medicationRequests) {
    // Counting prior systemic therapies from MedicationRequest is approximate.
    // EPIC sometimes uses MedicationStatement for past therapies — that's a
    // future enhancement. For now: count distinct medication codes ordered
    // with intent=order|plan that have been completed.
    const distinct = new Set();
    for (const mr of medicationRequests || []) {
        if (!['order', 'plan'].includes(mr.intent)) continue;
        if (!['completed', 'stopped', 'active'].includes(mr.status)) continue;
        const code = mr.medicationCodeableConcept?.coding?.[0]?.code
                  || mr.medicationCodeableConcept?.text;
        if (code) distinct.add(String(code));
    }
    return distinct.size;
}

function pickGender(patient) {
    const g = (patient?.gender || '').toLowerCase();
    if (['male', 'female', 'other', 'unknown'].includes(g)) return g;
    return null;
}

/**
 * @param {object} bundle  { patient, conditions, observations, medicationRequests, procedures }
 * @returns {object}  Internal Patient (see EligibilityMatcher).
 */
/**
 * @param {object} bundle  { patient, conditions, observations, medicationRequests, procedures }
 * @param {object} [options]
 * @param {string|null} [options.ageReferenceDate]  Override the date used to compute age.
 *        Production behaviour is to compute age as of today. Callers may pass
 *        an explicit date in narrow dev/sandbox scenarios (see callback.js).
 * @returns {object} internal Patient (see EligibilityMatcher).
 */
function normalize(bundle, options = {}) {
    const { patient, conditions, observations, medicationRequests } = bundle ?? {};

    return {
        age:               ageFromBirthDate(patient?.birthDate, options.ageReferenceDate ?? null),
        gender:            pickGender(patient),
        cancerType:        pickCancerType(conditions),
        cancerStage:       pickCancerStage(conditions, observations),
        mutationBiomarker: pickBiomarker(observations),
        ecog:              pickEcog(observations),
        lineOfTreatment:   pickLineOfTreatment(medicationRequests),
        // We do NOT include name, MRN, DOB, address, phone, email — anything
        // downstream that needs to identify the patient must use the FHIR
        // patient id over a separate channel (e.g. the session JWT subject).
    };
}

module.exports = {
    normalize,
    // exported for tests
    _ageFromBirthDate: ageFromBirthDate,
    _pickCancerType:   pickCancerType,
    _pickEcog:         pickEcog,
};
