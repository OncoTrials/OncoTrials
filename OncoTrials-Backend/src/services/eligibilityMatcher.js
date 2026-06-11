// CommonJS port of OncoTrials-Frontend/src/utils/EligibilityMatcher.js.
//
// Both copies are deliberate (see epic-fhir-integration-plan.md §2). The
// frontend copy still drives the in-page self-search; this copy is used by
// the server-side trialRanker. Keep them in sync manually when scoring
// rules change.

class EligibilityMatcher {
    static STATUS = {
        LIKELY_ELIGIBLE: 'likely_eligible',
        ELIGIBLE:        'eligible',
        NEEDS_REVIEW:    'needs_review',
        NOT_ELIGIBLE:    'not_eligible',
    };

    static evaluatePatientAgainstTrial(patient, trial) {
        const clinicianJson = trial?.eligibility_summary_clinician_json || {};

        const inclusionCriteria = Array.isArray(clinicianJson.inclusion_criteria)
            ? clinicianJson.inclusion_criteria
            : [];

        const exclusionCriteria = Array.isArray(clinicianJson.exclusion_criteria)
            ? clinicianJson.exclusion_criteria
            : [];

        const reasons = {
            met_inclusion:        [],
            failed_inclusion:     [],
            triggered_exclusion: [],
            missing_information: [],
            notes:                [],
        };

        let score = 50;
        let hardFailure = false;

        // Trial status. Normalize to handle both ClinicalTrials.gov v2
        // SCREAMING_SNAKE_CASE ("NOT_YET_RECRUITING") and any legacy
        // hyphen/space-cased values ("Not yet recruiting") with one rule.
        if (trial?.status) {
            const openStatuses = ['recruiting', 'not-yet-recruiting', 'enrolling-by-invitation'];
            const normalized = String(trial.status).toLowerCase().replace(/[_\s]+/g, '-');
            if (openStatuses.includes(normalized)) {
                reasons.met_inclusion.push(`Trial is currently ${trial.status}.`);
                score += 5;
            } else {
                reasons.failed_inclusion.push(`Trial status is ${trial.status}.`);
                score -= 15;
            }
        }

        const sexCheck = this.checkSex(patient, trial);
        this.applyCheckResult(sexCheck, reasons);
        score += sexCheck.scoreDelta;
        if (sexCheck.hardFailure) hardFailure = true;

        const ageCheck = this.checkAge(patient, trial, inclusionCriteria);
        this.applyCheckResult(ageCheck, reasons);
        score += ageCheck.scoreDelta;
        if (ageCheck.hardFailure) hardFailure = true;

        const diagnosisCheck = this.checkDiagnosis(patient, trial, inclusionCriteria);
        this.applyCheckResult(diagnosisCheck, reasons);
        score += diagnosisCheck.scoreDelta;
        if (diagnosisCheck.hardFailure) hardFailure = true;

        const stageCheck = this.checkCancerStage(patient, trial, inclusionCriteria);
        this.applyCheckResult(stageCheck, reasons);
        score += stageCheck.scoreDelta;

        const biomarkerCheck = this.checkBiomarker(patient, trial, inclusionCriteria);
        this.applyCheckResult(biomarkerCheck, reasons);
        score += biomarkerCheck.scoreDelta;

        const ecogCheck = this.checkECOG(patient, inclusionCriteria);
        this.applyCheckResult(ecogCheck, reasons);
        score += ecogCheck.scoreDelta;
        if (ecogCheck.hardFailure) hardFailure = true;

        const priorLinesCheck = this.checkPriorLinesOfTherapy(patient, inclusionCriteria);
        this.applyCheckResult(priorLinesCheck, reasons);
        score += priorLinesCheck.scoreDelta;
        if (priorLinesCheck.hardFailure) hardFailure = true;

        // Exclusion criteria text scan — surface anything the patient appears to
        // trigger so the AI step (PR 2) has a head start.
        const exclusionHits = this.scanExclusionCriteria(patient, exclusionCriteria);
        for (const hit of exclusionHits) {
            reasons.triggered_exclusion.push(hit);
        }

        score = Math.max(0, Math.min(100, score));

        const status = this.determineStatus({ score, hardFailure, reasons });

        return { status, score, reasons };
    }

    static determineStatus({ score, hardFailure, reasons }) {
        if (hardFailure || reasons.triggered_exclusion.length > 0) {
            return this.STATUS.NOT_ELIGIBLE;
        }
        if (reasons.failed_inclusion.length >= 2) {
            return this.STATUS.NOT_ELIGIBLE;
        }

        const hasMissingCriticalInfo =
            reasons.missing_information.length > 0 || reasons.notes.length > 0;

        if (score >= 85 && !hasMissingCriticalInfo) return this.STATUS.LIKELY_ELIGIBLE;
        if (score >= 70 && reasons.failed_inclusion.length === 0) return this.STATUS.ELIGIBLE;
        return this.STATUS.NEEDS_REVIEW;
    }

    static applyCheckResult(result, reasons) {
        if (!result) return;
        if (result.met)       reasons.met_inclusion.push(result.met);
        if (result.failed)    reasons.failed_inclusion.push(result.failed);
        if (result.exclusion) reasons.triggered_exclusion.push(result.exclusion);
        if (result.missing)   reasons.missing_information.push(result.missing);
        if (result.note)      reasons.notes.push(result.note);
    }

    static makeResult({
        met = null, failed = null, exclusion = null,
        missing = null, note = null,
        scoreDelta = 0, hardFailure = false,
    }) {
        return { met, failed, exclusion, missing, note, scoreDelta, hardFailure };
    }

    // ---- Individual checks ----

    static checkSex(patient, trial) {
        const patientGender = patient?.gender?.toLowerCase()?.trim();
        const trialSex = trial?.sex?.toLowerCase()?.trim();

        if (!trialSex || trialSex === 'all') {
            return this.makeResult({ note: 'Trial does not restrict sex.', scoreDelta: 2 });
        }
        if (!patientGender) {
            return this.makeResult({ missing: 'Patient gender is not provided.', scoreDelta: -5 });
        }
        if (patientGender === trialSex) {
            return this.makeResult({
                met: `Patient gender matches trial requirement (${trial.sex}).`,
                scoreDelta: 10,
            });
        }
        return this.makeResult({
            failed: `Patient gender does not match trial requirement (${trial.sex}).`,
            scoreDelta: -25,
            hardFailure: true,
        });
    }

    static checkAge(patient, trial, inclusionCriteria) {
        const patientAge = Number(patient?.age);
        if (!Number.isFinite(patientAge)) {
            return this.makeResult({ missing: 'Patient age is not provided.', scoreDelta: -10 });
        }

        const minAge = this.extractMinimumAge(trial);
        // Trials store maximum_age too — prefer the structured column, fall back
        // to inclusion-text scan (matches the frontend matcher's original behaviour).
        const maxAge = this.extractMaximumAgeFromTrial(trial)
                    ?? this.extractMaximumAgeFromText(inclusionCriteria);

        if (minAge != null && patientAge < minAge) {
            return this.makeResult({
                failed: `Patient age ${patientAge} is below minimum age requirement of ${minAge}.`,
                scoreDelta: -30,
                hardFailure: true,
            });
        }
        if (maxAge != null && patientAge > maxAge) {
            return this.makeResult({
                failed: `Patient age ${patientAge} is above maximum age requirement of ${maxAge}.`,
                scoreDelta: -30,
                hardFailure: true,
            });
        }
        if (minAge != null && maxAge != null) {
            return this.makeResult({
                met: `Patient age ${patientAge} is within required range (${minAge}-${maxAge}).`,
                scoreDelta: 15,
            });
        }
        if (minAge != null) {
            return this.makeResult({
                met: `Patient age ${patientAge} meets minimum age requirement of ${minAge}.`,
                scoreDelta: 12,
            });
        }
        return this.makeResult({
            note: `Patient age ${patientAge} provided, but no structured age limit was found.`,
            scoreDelta: 2,
        });
    }

    static checkDiagnosis(patient, trial, inclusionCriteria) {
        const patientDiagnosis = patient?.cancerType?.toLowerCase()?.trim();
        if (!patientDiagnosis) {
            return this.makeResult({
                missing: 'Patient diagnosis / cancer type is not provided.',
                scoreDelta: -10,
            });
        }

        const trialConditions = Array.isArray(trial?.conditions)
            ? trial.conditions.map((c) => String(c).toLowerCase())
            : [];
        const inclusionText = inclusionCriteria.join(' ').toLowerCase();
        const haystack = trialConditions.join(' ') + ' ' + inclusionText;

        // Direct substring match either way (covers e.g. "breast cancer" patient
        // → "Breast Cancer" trial condition).
        const directMatch =
            trialConditions.some((c) => c.includes(patientDiagnosis) || patientDiagnosis.includes(c)) ||
            inclusionText.includes(patientDiagnosis);

        // Keyword fallback. FHIR-sourced diagnoses use SNOMED terminology like
        // "Neoplasm of prostate" or "Malignant neoplasm of breast (disorder)";
        // ClinicalTrials.gov uses lay terms like "Prostate Cancer". Direct
        // substring matching never lines those up. Extract the meaningful
        // anatomical / molecular tokens from the patient diagnosis and look
        // for ANY of them in the trial's conditions or inclusion criteria.
        const patientKeywords = EligibilityMatcher.extractCancerKeywords(patientDiagnosis);
        const keywordHit = patientKeywords.find((kw) => haystack.includes(kw));

        if (directMatch || keywordHit) {
            return this.makeResult({
                met: keywordHit && !directMatch
                    ? `Patient diagnosis appears related to trial subject (matched on "${keywordHit}").`
                    : 'Patient diagnosis appears to match the trial disease requirement.',
                scoreDelta: 18,
            });
        }
        return this.makeResult({
            failed: 'Patient diagnosis does not clearly match the trial disease requirement.',
            scoreDelta: -20,
            hardFailure: true,
        });
    }

    // Stopwords for cancer-term keyword extraction. We strip anything that
    // appears in nearly every oncology diagnosis (so it contributes no signal)
    // and keep the discriminating terms — usually the organ/site, biomarker,
    // histology subtype, or modifier ("metastatic", "advanced").
    //
    // Used by both the Stage 1 SQL prefilter and the Stage 2 diagnosis check
    // so the two stages agree on what counts as "related."
    static CANCER_STOPWORDS = new Set([
        // Generic disease / tumour / cell terms
        'neoplasm', 'neoplasms', 'neoplastic',
        'malignant', 'malignancy', 'benign',
        'tumor', 'tumour', 'tumors', 'tumours',
        'cancer', 'cancers', 'carcinoma', 'carcinomas',
        'disorder', 'disease', 'diseases',
        'primary', 'secondary', 'recurrent',
        'cell', 'cells',

        // Stage / severity / progression descriptors. These appear in nearly
        // every oncology diagnosis and never discriminate disease on their own.
        // Without these, "Stage IV" leaks "stage" + "iv" into the keyword list
        // and Stage 1 SQL plus Stage 2 diagnosis check both substring-match
        // those against unrelated trials (Alzheimer's "Stage IV", trials that
        // mention "IV infusion", etc.) — see PR review #2026-05-30.
        'stage', 'iii', 'vii', 'viii',
        'metastatic', 'advanced', 'early', 'late', 'localized', 'locally',
        'high', 'low', 'mid', 'grade', 'level', 'score',
        'mild', 'moderate', 'severe',
        'clinical', 'pathologic', 'pathological', 'histologic', 'histological',
        'subtype', 'type', 'positive', 'negative', 'status', 'state',
        'multiple', 'diffuse', 'focal', 'mixed', 'extensive', 'limited',

        // Hematology subtype shorthand (kappa/lambda light chains, Ig isotypes,
        // ISS staging) — not site/disease-discriminating.
        'iss', 'igg', 'iga', 'igm', 'igd', 'ige', 'kappa', 'lambda',

        // Articles / prepositions
        'of', 'the', 'a', 'an', 'and', 'or', 'with', 'in', 'for', 'on', 'at',
        'from', 'to', 'by', 'as', 'is', 'are', 'was', 'were', 'this', 'that',
    ]);

    static extractCancerKeywords(text) {
        if (!text) return [];
        return String(text)
            .toLowerCase()
            .replace(/\([^)]*\)/g, ' ')             // strip parenthesized notes like "(disorder)"
            .replace(/[^a-z0-9+\-\s]/g, ' ')        // keep + and - (biomarkers like "HER2+")
            .split(/\s+/)
            // Require ≥3 chars. Two-character tokens ("iv", "ii", "er", "pr")
            // substring-match too aggressively against unrelated trial text
            // (e.g. "iv" inside "intravenous", "Stage IV" of Alzheimer's, etc).
            // All real biomarker tokens — alk, ret, met, her2, kras, egfr,
            // braf, ros1, ntrk, pdgfra — are 3+ chars and survive this filter.
            .filter((t) => t.length >= 3 && !EligibilityMatcher.CANCER_STOPWORDS.has(t));
    }

    static checkBiomarker(patient, trial, inclusionCriteria) {
        const patientBiomarker = patient?.mutationBiomarker?.toLowerCase()?.trim();
        const trialBiomarkerText = [trial?.biomarker_criteria || '', ...inclusionCriteria]
            .join(' ').toLowerCase();

        const likelyHasBiomarkerRequirement =
            /(egfr|kras|alk|braf|ros1|her2|cd79b|biomarker|mutation)/i.test(trialBiomarkerText);

        if (!likelyHasBiomarkerRequirement) {
            return this.makeResult({
                note: 'No clear biomarker requirement was detected.',
                scoreDelta: 1,
            });
        }
        if (!patientBiomarker) {
            return this.makeResult({
                missing: 'Patient biomarker information is not provided.',
                scoreDelta: -8,
            });
        }
        if (trialBiomarkerText.includes(patientBiomarker)) {
            return this.makeResult({
                met: 'Patient biomarker appears to match trial biomarker criteria.',
                scoreDelta: 12,
            });
        }
        return this.makeResult({
            failed: 'Patient biomarker does not clearly match the trial biomarker criteria.',
            scoreDelta: -10,
        });
    }

    static checkECOG(patient, inclusionCriteria) {
        const ecogRule = this.extractMaxECOG(inclusionCriteria);
        if (ecogRule == null) {
            return this.makeResult({ note: 'No structured ECOG requirement detected.', scoreDelta: 0 });
        }
        const patientEcog = patient?.ecog;
        if (patientEcog == null || patientEcog === '') {
            return this.makeResult({
                missing: `ECOG performance status is required by the trial (max ${ecogRule}) but not provided.`,
                scoreDelta: -12,
            });
        }
        const numericEcog = Number(patientEcog);
        if (!Number.isFinite(numericEcog)) {
            return this.makeResult({
                missing: 'Patient ECOG performance status is invalid or missing.',
                scoreDelta: -12,
            });
        }
        if (numericEcog <= ecogRule) {
            return this.makeResult({
                met: `Patient ECOG ${numericEcog} meets requirement (<= ${ecogRule}).`,
                scoreDelta: 15,
            });
        }
        return this.makeResult({
            failed: `Patient ECOG ${numericEcog} exceeds allowed maximum of ${ecogRule}.`,
            scoreDelta: -25,
            hardFailure: true,
        });
    }

    static checkPriorLinesOfTherapy(patient, inclusionCriteria) {
        const requiredMin = this.extractMinPriorLines(inclusionCriteria);
        if (requiredMin == null) {
            return this.makeResult({
                note: 'No structured prior-lines-of-therapy requirement detected.',
                scoreDelta: 0,
            });
        }
        const patientLines = Number(patient?.lineOfTreatment);
        if (!Number.isFinite(patientLines)) {
            return this.makeResult({
                missing: `Trial requires at least ${requiredMin} prior lines of therapy, but patient value is not provided.`,
                scoreDelta: -12,
            });
        }
        if (patientLines >= requiredMin) {
            return this.makeResult({
                met: `Patient has ${patientLines} prior lines of therapy and meets minimum requirement of ${requiredMin}.`,
                scoreDelta: 14,
            });
        }
        return this.makeResult({
            failed: `Patient has ${patientLines} prior lines of therapy, below required minimum of ${requiredMin}.`,
            scoreDelta: -20,
            hardFailure: true,
        });
    }

    static checkCancerStage(patient, trial, inclusionCriteria) {
        const patientStage = patient?.cancerStage?.toLowerCase()?.trim();
        const text = [
            ...(Array.isArray(inclusionCriteria) ? inclusionCriteria : []),
            trial?.study_description || '',
        ].join(' ').toLowerCase();

        const stageKeywords = ['stage i', 'stage ii', 'stage iii', 'stage iv', 'metastatic', 'advanced'];
        const trialStages = stageKeywords.filter((s) => text.includes(s));

        if (trialStages.length === 0) {
            return this.makeResult({ note: 'No explicit cancer stage requirement detected.', scoreDelta: 0 });
        }
        if (!patientStage) {
            return this.makeResult({ missing: 'Patient cancer stage is not provided.', scoreDelta: -10 });
        }
        const matches = trialStages.some(
            (s) => patientStage.includes(s.replace('stage ', '')) || patientStage.includes(s)
        );
        if (matches) {
            return this.makeResult({
                met: `Patient cancer stage appears compatible with trial requirement (${trialStages.join(', ')}).`,
                scoreDelta: 12,
            });
        }
        return this.makeResult({
            failed: `Patient cancer stage (${patientStage}) does not clearly match trial stage requirement (${trialStages.join(', ')}).`,
            scoreDelta: -15,
        });
    }

    // ---- Exclusion-criteria scan (server-only addition) ----

    // Surface obvious patient/exclusion mismatches by keyword. Conservative —
    // we'd rather under-report than wrongly disqualify; the AI explainer (PR 2)
    // can flag subtler cases.
    static scanExclusionCriteria(patient, exclusionCriteria) {
        if (!Array.isArray(exclusionCriteria) || exclusionCriteria.length === 0) return [];
        const hits = [];

        const patientBiomarker = patient?.mutationBiomarker?.toLowerCase()?.trim();
        for (const rule of exclusionCriteria) {
            const text = String(rule).toLowerCase();
            if (patientBiomarker && text.includes(patientBiomarker)
                && /(excluded|exclusion|not eligible|must not have)/.test(text)) {
                hits.push(`Patient biomarker "${patientBiomarker}" appears in an exclusion criterion: "${rule}".`);
            }
        }
        return hits;
    }

    // ---- Extraction helpers ----

    static extractMinimumAge(trial) {
        const raw = trial?.minimum_age;
        if (!raw) return null;
        const value = this.convertAgeToYears(raw);
        return Number.isFinite(value) ? value : null;
    }

    // New: read the structured maximum_age column when present
    static extractMaximumAgeFromTrial(trial) {
        const raw = trial?.maximum_age;
        if (!raw) return null;
        const value = this.convertAgeToYears(raw);
        return Number.isFinite(value) ? value : null;
    }

    static extractMaximumAgeFromText(inclusionCriteria) {
        const text = inclusionCriteria.join(' ');
        let m = text.match(/age range:\s*(\d+)\s*[-–]\s*(\d+)/i);
        if (m) return Number(m[2]);
        m = text.match(/aged?\s*(\d+)\s*[-–]\s*(\d+)\s*years?/i);
        if (m) return Number(m[2]);
        return null;
    }

    static extractMaxECOG(inclusionCriteria) {
        const text = inclusionCriteria.join(' ');
        let m = text.match(/ecog.*?0\s*[-–]\s*(\d+)/i);
        if (m) return Number(m[1]);
        m = text.match(/ecog.*?(?:<=|≤)\s*(\d+)/i);
        if (m) return Number(m[1]);
        return null;
    }

    static extractMinPriorLines(inclusionCriteria) {
        const text = inclusionCriteria.join(' ');
        let m = text.match(/(?:≥|>=|at least)\s*(\d+)\s*prior lines of therapy/i);
        if (m) return Number(m[1]);
        m = text.match(/(\d+)\+?\s*prior lines of therapy/i);
        if (m) return Number(m[1]);
        return null;
    }

    static convertAgeToYears(rawAge) {
        if (!rawAge || typeof rawAge !== 'string') return null;
        const parts = rawAge.trim().split(/\s+/);
        if (parts.length < 2) return null;
        const value = Number(parts[0]);
        const unit = parts[1].toLowerCase();
        if (!Number.isFinite(value)) return null;
        if (unit.startsWith('year'))  return value;
        if (unit.startsWith('month')) return value / 12;
        if (unit.startsWith('week'))  return value / 52;
        if (unit.startsWith('day'))   return value / 365;
        return null;
    }
}

module.exports = EligibilityMatcher;
