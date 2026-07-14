import { convertStatus } from "./TrialCardUtils";

class EligibilityMatcher {
  static STATUS = {
    LIKELY_ELIGIBLE: "likely_eligible",
    ELIGIBLE: "eligible",
    NEEDS_REVIEW: "needs_review",
    NOT_ELIGIBLE: "not_eligible",
  };

  static AGE_RANGE_RE = /age range:\s*(\d+)\s*[-–]\s*(\d+)/i;
  static AGED_RANGE_RE = /aged?\s*(\d+)\s*[-–]\s*(\d+)\s*years?/i;
  static ECOG_ZERO_TO_N_RE = /ecog.*?0\s*[-–]\s*(\d+)/i;
  static ECOG_LTE_RE = /ecog.*?(?:<=|≤)\s*(\d+)/i;
  static PRIOR_LINES_ATLEAST_RE = /(?:≥|>=|at least)\s*(\d+)\s*prior lines of therapy/i;
  static PRIOR_LINES_N_PLUS_RE = /(\d+)\+?\s*prior lines of therapy/i;
  static BIOMARKER_KEYWORDS_RE = /(egfr|kras|alk|braf|ros1|her2|cd79b|biomarker|mutation)/i;

  // Word-boundary patterns instead of substring matching: previously
  // text.includes("stage i") also matched "stage ii"/"stage iii"/"stage iv",
  // and patientStage.includes("i") let a stage IV patient match a stage I
  // requirement. Roman-numeral lookaheads prevent prefix collisions.
  static STAGE_PATTERNS = [
    { label: "stage i", re: /\bstage\s+i\b(?![iv])/ },
    { label: "stage ii", re: /\bstage\s+ii\b(?!i)/ },
    { label: "stage iii", re: /\bstage\s+iii\b/ },
    { label: "stage iv", re: /\bstage\s+iv\b/ },
    { label: "metastatic", re: /\bmetastatic\b/ },
    { label: "advanced", re: /\badvanced\b/ },
  ];

  static evaluatePatientAgainstTrial(patient, trial) {
    const clinicianJson = trial?.eligibility_summary_clinician_json || {};

    const inclusionCriteria = Array.isArray(clinicianJson.inclusion_criteria)
      ? clinicianJson.inclusion_criteria
      : [];

    const exclusionCriteria = Array.isArray(clinicianJson.exclusion_criteria)
      ? clinicianJson.exclusion_criteria
      : [];


    const inclusionText = inclusionCriteria.join(" ").toLowerCase();

    const reasons = {
      met_inclusion: [],
      failed_inclusion: [],
      triggered_exclusion: [],
      missing_information: [],
      notes: [],
    };

    let score = 50;
    let hardFailure = false;


    if (exclusionCriteria.length > 0) {
      reasons.notes.push(
        `${exclusionCriteria.length} exclusion criteria were not automatically evaluated and require manual review.`
      );
    }


    if (trial?.status) {
      const openStatuses = [
        "recruiting",
        "not-yet-recruiting",
        "enrolling-by-invitation",
      ];
      const normalized = String(trial.status).toLowerCase().replace(/[_\s]+/g, "-");

      if (openStatuses.includes(normalized)) {
        reasons.met_inclusion.push(`Trial is currently ${convertStatus(trial.status)}.`);
        score += 5;
      } else {
        reasons.failed_inclusion.push(`Trial status is ${convertStatus(trial.status)}.`);
        score -= 15;
      }
    }

    const sexCheck = this.checkSex(patient, trial);
    this.applyCheckResult(sexCheck, reasons);
    score += sexCheck.scoreDelta;
    if (sexCheck.hardFailure) hardFailure = true;

    const ageCheck = this.checkAge(patient, trial, inclusionText);
    this.applyCheckResult(ageCheck, reasons);
    score += ageCheck.scoreDelta;
    if (ageCheck.hardFailure) hardFailure = true;

    const diagnosisCheck = this.checkDiagnosis(patient, trial, inclusionText);
    this.applyCheckResult(diagnosisCheck, reasons);
    score += diagnosisCheck.scoreDelta;
    if (diagnosisCheck.hardFailure) hardFailure = true;

    const stageCheck = this.checkCancerStage(patient, trial, inclusionText);
    this.applyCheckResult(stageCheck, reasons);
    score += stageCheck.scoreDelta;

    const biomarkerCheck = this.checkBiomarker(patient, trial, inclusionText);
    this.applyCheckResult(biomarkerCheck, reasons);
    score += biomarkerCheck.scoreDelta;

    const ecogCheck = this.checkECOG(patient, inclusionText);
    this.applyCheckResult(ecogCheck, reasons);
    score += ecogCheck.scoreDelta;
    if (ecogCheck.hardFailure) hardFailure = true;

    const priorLinesCheck = this.checkPriorLinesOfTherapy(patient, inclusionText);
    this.applyCheckResult(priorLinesCheck, reasons);
    score += priorLinesCheck.scoreDelta;
    if (priorLinesCheck.hardFailure) hardFailure = true;

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

    const hasMissingCriticalInfo = reasons.missing_information.length > 0;
    if (score >= 85 && !hasMissingCriticalInfo) {
      return this.STATUS.LIKELY_ELIGIBLE;
    }
    if (score >= 70 && reasons.failed_inclusion.length === 0) {
      return this.STATUS.ELIGIBLE;
    }
    return this.STATUS.NEEDS_REVIEW;
  }

  static applyCheckResult(result, reasons) {
    if (!result) return;
    if (result.met) reasons.met_inclusion.push(result.met);
    if (result.failed) reasons.failed_inclusion.push(result.failed);
    if (result.exclusion) reasons.triggered_exclusion.push(result.exclusion);
    if (result.missing) reasons.missing_information.push(result.missing);
    if (result.note) reasons.notes.push(result.note);
  }

  static makeResult({
    met = null,
    failed = null,
    exclusion = null,
    missing = null,
    note = null,
    scoreDelta = 0,
    hardFailure = false,
  }) {
    return { met, failed, exclusion, missing, note, scoreDelta, hardFailure };
  }

  static checkSex(patient, trial) {
    const patientGender = patient?.gender?.toLowerCase()?.trim();
    const trialSex = trial?.sex?.toLowerCase()?.trim();

    if (!trialSex || trialSex === "all") {
      return this.makeResult({ note: "Trial does not restrict sex.", scoreDelta: 2 });
    }
    if (!patientGender || patientGender === "all") {
      return this.makeResult({
        missing: `Trial restricts sex to ${trial.sex}, but patient gender was not provided.`,
        scoreDelta: -5,
      });
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

  static checkAge(patient, trial, inclusionText) {
    const patientAge = Number(patient?.age);

    if (!Number.isFinite(patientAge)) {
      return this.makeResult({ missing: "Patient age is not provided.", scoreDelta: -10 });
    }

    const minAge = this.extractMinimumAge(trial);
    const maxAgeFromColumn = trial?.maximum_age != null
      ? this.convertAgeToYears(String(trial.maximum_age))
      : null;
    const maxAge = Number.isFinite(maxAgeFromColumn)
      ? maxAgeFromColumn
      : this.extractMaximumAge(inclusionText);

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

  static checkDiagnosis(patient, trial, inclusionText) {
    const patientDiagnosis = patient?.cancerType?.toLowerCase()?.trim();

    if (!patientDiagnosis) {
      return this.makeResult({
        missing: "Patient diagnosis / cancer type is not provided.",
        scoreDelta: -10,
      });
    }

    const trialConditions = Array.isArray(trial?.conditions)
      ? trial.conditions.map((c) => String(c).toLowerCase())
      : [];

    const matchesTrialConditions = trialConditions.some(
      (condition) =>
        condition.includes(patientDiagnosis) || patientDiagnosis.includes(condition)
    );
    const matchesInclusionText = inclusionText.includes(patientDiagnosis);

    if (matchesTrialConditions || matchesInclusionText) {
      return this.makeResult({
        met: `Patient diagnosis appears to match the trial disease requirement.`,
        scoreDelta: 18,
      });
    }
    return this.makeResult({
      failed: `Patient diagnosis does not clearly match the trial disease requirement.`,
      scoreDelta: -20,
      hardFailure: true,
    });
  }

  static checkBiomarker(patient, trial, inclusionText) {
    const patientBiomarker = patient?.mutationBiomarker?.toLowerCase()?.trim();
    const trialBiomarkerText = `${trial?.biomarker_criteria || ""} ${inclusionText}`.toLowerCase();

    const likelyHasBiomarkerRequirement = this.BIOMARKER_KEYWORDS_RE.test(trialBiomarkerText);

    if (!likelyHasBiomarkerRequirement) {
      return this.makeResult({ note: "No clear biomarker requirement was detected.", scoreDelta: 1 });
    }
    if (!patientBiomarker) {
      return this.makeResult({
        missing: "Patient biomarker information is not provided.",
        scoreDelta: -8,
      });
    }
    if (trialBiomarkerText.includes(patientBiomarker)) {
      return this.makeResult({
        met: `Patient biomarker appears to match trial biomarker criteria.`,
        scoreDelta: 12,
      });
    }
    return this.makeResult({
      failed: `Patient biomarker does not clearly match the trial biomarker criteria.`,
      scoreDelta: -10,
    });
  }

  static checkECOG(patient, inclusionText) {
    const patientEcog = patient?.ecog;
    const ecogRule = this.extractMaxECOG(inclusionText);

    if (ecogRule == null) {
      return this.makeResult({ note: "No structured ECOG requirement detected.", scoreDelta: 0 });
    }
    if (patientEcog == null || patientEcog === "") {
      return this.makeResult({
        missing: `ECOG performance status is required by the trial (max ${ecogRule}) but not provided.`,
        scoreDelta: -12,
      });
    }

    const numericEcog = Number(patientEcog);
    if (!Number.isFinite(numericEcog)) {
      return this.makeResult({
        missing: "Patient ECOG performance status is invalid or missing.",
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

  static checkPriorLinesOfTherapy(patient, inclusionText) {
    const requiredMin = this.extractMinPriorLines(inclusionText);

    if (requiredMin == null) {
      return this.makeResult({
        note: "No structured prior-lines-of-therapy requirement detected.",
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

  static checkCancerStage(patient, trial, inclusionText) {
    const patientStage = patient?.cancerStage?.toLowerCase()?.trim();
    const text = `${inclusionText} ${trial?.study_description || ""}`.toLowerCase();

    const trialStages = this.STAGE_PATTERNS.filter(({ re }) => re.test(text));

    if (trialStages.length === 0) {
      return this.makeResult({ note: "No explicit cancer stage requirement detected.", scoreDelta: 0 });
    }
    if (!patientStage) {
      return this.makeResult({ missing: "Patient cancer stage is not provided.", scoreDelta: -10 });
    }

    // Match the patient's stage against the same word-boundary patterns —
    // form values are exactly "stage i".."stage iv"/"metastatic"/"advanced",
    // so this is effectively an exact-label match without substring bleed.
    const matches = trialStages.some(({ re }) => re.test(patientStage));

    const stageLabels = trialStages.map((s) => s.label).join(", ");

    if (matches) {
      return this.makeResult({
        met: `Patient cancer stage appears compatible with trial requirement (${stageLabels}).`,
        scoreDelta: 12,
      });
    }
    return this.makeResult({
      failed: `Patient cancer stage (${patientStage}) does not clearly match trial stage requirement (${stageLabels}).`,
      scoreDelta: -15,
    });
  }


  static extractMinimumAge(trial) {
    const raw = trial?.minimum_age;
    if (!raw) return null;
    const value = this.convertAgeToYears(raw);
    return Number.isFinite(value) ? value : null;
  }

  static extractMaximumAge(inclusionText) {
    let match = inclusionText.match(this.AGE_RANGE_RE);
    if (match) return Number(match[2]);

    match = inclusionText.match(this.AGED_RANGE_RE);
    if (match) return Number(match[2]);

    return null;
  }

  static extractMaxECOG(inclusionText) {
    let match = inclusionText.match(this.ECOG_ZERO_TO_N_RE);
    if (match) return Number(match[1]);

    match = inclusionText.match(this.ECOG_LTE_RE);
    if (match) return Number(match[1]);

    return null;
  }

  static extractMinPriorLines(inclusionText) {
    let match = inclusionText.match(this.PRIOR_LINES_ATLEAST_RE);
    if (match) return Number(match[1]);

    match = inclusionText.match(this.PRIOR_LINES_N_PLUS_RE);
    if (match) return Number(match[1]);

    return null;
  }

  static convertAgeToYears(rawAge) {
    if (!rawAge || typeof rawAge !== "string") return null;

    const parts = rawAge.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const value = Number(parts[0]);
    const unit = parts[1].toLowerCase();

    if (!Number.isFinite(value)) return null;

    if (unit.startsWith("year")) return value;
    if (unit.startsWith("month")) return value / 12;
    if (unit.startsWith("week")) return value / 52;
    if (unit.startsWith("day")) return value / 365;

    return null;
  }
}

export default EligibilityMatcher;