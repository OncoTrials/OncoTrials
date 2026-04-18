// utils/EligibilityMatcher.js

class EligibilityMatcher {
  static STATUS = {
    LIKELY_ELIGIBLE: "likely_eligible",
    ELIGIBLE: "eligible",
    NEEDS_REVIEW: "needs_review",
    NOT_ELIGIBLE: "not_eligible",
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
      met_inclusion: [],
      failed_inclusion: [],
      triggered_exclusion: [],
      missing_information: [],
      notes: [],
    };

    let score = 50;
    let hardFailure = false;

    // -------------------------
    // Trial-level structured checks
    // -------------------------

    // Recruiting / status
    if (trial?.status) {
      const openStatuses = [
        "recruiting",
        "not-yet-recruiting",
        "enrolling-by-invitation",
      ];

      if (openStatuses.includes(String(trial.status).toLowerCase())) {
        reasons.met_inclusion.push(`Trial is currently ${trial.status}.`);
        score += 5;
      } else {
        reasons.failed_inclusion.push(`Trial status is ${trial.status}.`);
        score -= 15;
      }
    }

    // Sex / gender
    const sexCheck = this.checkSex(patient, trial);
    this.applyCheckResult(sexCheck, reasons);
    score += sexCheck.scoreDelta;
    if (sexCheck.hardFailure) hardFailure = true;

    // Age
    const ageCheck = this.checkAge(patient, trial, inclusionCriteria);
    this.applyCheckResult(ageCheck, reasons);
    score += ageCheck.scoreDelta;
    if (ageCheck.hardFailure) hardFailure = true;

    // Cancer type / diagnosis
    const diagnosisCheck = this.checkDiagnosis(
      patient,
      trial,
      inclusionCriteria
    );
    this.applyCheckResult(diagnosisCheck, reasons);
    score += diagnosisCheck.scoreDelta;
    if (diagnosisCheck.hardFailure) hardFailure = true;

    // Biomarker
    const biomarkerCheck = this.checkBiomarker(
      patient,
      trial,
      inclusionCriteria
    );
    this.applyCheckResult(biomarkerCheck, reasons);
    score += biomarkerCheck.scoreDelta;

    // ECOG
    const ecogCheck = this.checkECOG(patient, inclusionCriteria);
    this.applyCheckResult(ecogCheck, reasons);
    score += ecogCheck.scoreDelta;
    if (ecogCheck.hardFailure) hardFailure = true;

    // Prior lines of therapy
    const priorLinesCheck = this.checkPriorLinesOfTherapy(
      patient,
      inclusionCriteria
    );
    this.applyCheckResult(priorLinesCheck, reasons);
    score += priorLinesCheck.scoreDelta;
    if (priorLinesCheck.hardFailure) hardFailure = true;

    // Pregnancy
    const pregnancyCheck = this.checkPregnancy(patient, exclusionCriteria);
    this.applyCheckResult(pregnancyCheck, reasons);
    score += pregnancyCheck.scoreDelta;
    if (pregnancyCheck.hardFailure) hardFailure = true;

    // ILD / pneumonitis
    const ildCheck = this.checkILD(patient, exclusionCriteria);
    this.applyCheckResult(ildCheck, reasons);
    score += ildCheck.scoreDelta;
    if (ildCheck.hardFailure) hardFailure = true;

    // Measurable disease
    const measurableDiseaseCheck = this.checkMeasurableDisease(
      patient,
      inclusionCriteria
    );
    this.applyCheckResult(measurableDiseaseCheck, reasons);
    score += measurableDiseaseCheck.scoreDelta;

    // Recent therapy / washout
    const recentTherapyCheck = this.checkRecentTherapy(
      patient,
      exclusionCriteria
    );
    this.applyCheckResult(recentTherapyCheck, reasons);
    score += recentTherapyCheck.scoreDelta;
    if (recentTherapyCheck.hardFailure) hardFailure = true;

    score = Math.max(0, Math.min(100, score));

    const status = this.determineStatus({
      score,
      hardFailure,
      reasons,
    });

    return {
      status,
      score,
      reasons,
    };
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
    return {
      met,
      failed,
      exclusion,
      missing,
      note,
      scoreDelta,
      hardFailure,
    };
  }

  // -------------------------
  // Individual checks
  // -------------------------

  static checkSex(patient, trial) {
    const patientGender = patient?.gender?.toLowerCase()?.trim();
    const trialSex = trial?.sex?.toLowerCase()?.trim();

    if (!trialSex || trialSex === "all") {
      return this.makeResult({
        note: "Trial does not restrict sex.",
        scoreDelta: 2,
      });
    }

    if (!patientGender) {
      return this.makeResult({
        missing: "Patient gender is not provided.",
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

  static checkAge(patient, trial, inclusionCriteria) {
    const patientAge = Number(patient?.age);

    if (!Number.isFinite(patientAge)) {
      return this.makeResult({
        missing: "Patient age is not provided.",
        scoreDelta: -10,
      });
    }

    const minAge = this.extractMinimumAge(trial);
    const maxAge = this.extractMaximumAge(inclusionCriteria);

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
        missing: "Patient diagnosis / cancer type is not provided.",
        scoreDelta: -10,
      });
    }

    const trialConditions = Array.isArray(trial?.conditions)
      ? trial.conditions.map((c) => String(c).toLowerCase())
      : [];

    const inclusionText = inclusionCriteria.join(" ").toLowerCase();

    const matchesTrialConditions = trialConditions.some(
      (condition) =>
        condition.includes(patientDiagnosis) ||
        patientDiagnosis.includes(condition)
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

  static checkBiomarker(patient, trial, inclusionCriteria) {
    const patientBiomarker = patient?.biomarker?.toLowerCase()?.trim();

    const trialBiomarkerText = [
      trial?.biomarker_criteria || "",
      ...inclusionCriteria,
    ]
      .join(" ")
      .toLowerCase();

    const likelyHasBiomarkerRequirement =
      /(egfr|kras|alk|braf|ros1|her2|cd79b|biomarker|mutation)/i.test(
        trialBiomarkerText
      );

    if (!likelyHasBiomarkerRequirement) {
      return this.makeResult({
        note: "No clear biomarker requirement was detected.",
        scoreDelta: 1,
      });
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

  static checkECOG(patient, inclusionCriteria) {
    const patientEcog = patient?.ecog;
    const ecogRule = this.extractMaxECOG(inclusionCriteria);

    if (ecogRule == null) {
      return this.makeResult({
        note: "No structured ECOG requirement detected.",
        scoreDelta: 0,
      });
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

  static checkPriorLinesOfTherapy(patient, inclusionCriteria) {
    const requiredMin = this.extractMinPriorLines(inclusionCriteria);

    if (requiredMin == null) {
      return this.makeResult({
        note: "No structured prior-lines-of-therapy requirement detected.",
        scoreDelta: 0,
      });
    }

    const patientLines = Number(patient?.priorLinesOfTherapy);

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

  static checkPregnancy(patient, exclusionCriteria) {
    const exclusionText = exclusionCriteria.join(" ").toLowerCase();
    const mentionsPregnancy = exclusionText.includes("pregnan");

    if (!mentionsPregnancy) {
      return this.makeResult({
        note: "No explicit pregnancy exclusion detected.",
        scoreDelta: 0,
      });
    }

    if (patient?.pregnant == null) {
      return this.makeResult({
        missing: "Pregnancy status may affect eligibility but is not provided.",
        scoreDelta: -8,
      });
    }

    if (patient.pregnant === true) {
      return this.makeResult({
        exclusion:
          "Patient is pregnant and the trial appears to exclude pregnancy.",
        scoreDelta: -40,
        hardFailure: true,
      });
    }

    return this.makeResult({
      met: "Pregnancy exclusion does not appear to apply.",
      scoreDelta: 6,
    });
  }

  static checkILD(patient, exclusionCriteria) {
    const exclusionText = exclusionCriteria.join(" ").toLowerCase();
    const mentionsILD =
      exclusionText.includes("ild") ||
      exclusionText.includes("interstitial lung disease") ||
      exclusionText.includes("pneumonitis");

    if (!mentionsILD) {
      return this.makeResult({
        note: "No explicit ILD/pneumonitis exclusion detected.",
        scoreDelta: 0,
      });
    }

    if (patient?.hasILD == null) {
      return this.makeResult({
        missing:
          "ILD / pneumonitis history may affect eligibility but is not provided.",
        scoreDelta: -8,
      });
    }

    if (patient.hasILD === true) {
      return this.makeResult({
        exclusion:
          "Patient history of ILD/pneumonitis appears to conflict with trial exclusions.",
        scoreDelta: -40,
        hardFailure: true,
      });
    }

    return this.makeResult({
      met: "ILD / pneumonitis exclusion does not appear to apply.",
      scoreDelta: 6,
    });
  }

  static checkMeasurableDisease(patient, inclusionCriteria) {
    const inclusionText = inclusionCriteria.join(" ").toLowerCase();
    const requiresMeasurableDisease =
      inclusionText.includes("measurable disease");

    if (!requiresMeasurableDisease) {
      return this.makeResult({
        note: "No measurable disease requirement detected.",
        scoreDelta: 0,
      });
    }

    if (patient?.hasMeasurableDisease == null) {
      return this.makeResult({
        missing:
          "Measurable disease requirement may apply, but patient data is not provided.",
        scoreDelta: -8,
      });
    }

    if (patient.hasMeasurableDisease === true) {
      return this.makeResult({
        met: "Patient meets measurable disease requirement.",
        scoreDelta: 10,
      });
    }

    return this.makeResult({
      failed: "Patient does not appear to meet measurable disease requirement.",
      scoreDelta: -15,
    });
  }

  static checkRecentTherapy(patient, exclusionCriteria) {
    const exclusionText = exclusionCriteria.join(" ").toLowerCase();
    const washoutDays = this.extractRecentTherapyWindowDays(exclusionText);

    if (washoutDays == null) {
      return this.makeResult({
        note: "No structured recent-therapy washout rule detected.",
        scoreDelta: 0,
      });
    }

    const daysSinceTherapy = Number(patient?.daysSinceLastTherapy);

    if (!Number.isFinite(daysSinceTherapy)) {
      return this.makeResult({
        missing: `Trial appears to require at least ${washoutDays} days since last therapy, but this patient value is missing.`,
        scoreDelta: -10,
      });
    }

    if (daysSinceTherapy >= washoutDays) {
      return this.makeResult({
        met: `Patient satisfies washout period (${daysSinceTherapy} days since last therapy, required >= ${washoutDays}).`,
        scoreDelta: 10,
      });
    }

    return this.makeResult({
      exclusion: `Patient may be within the prohibited washout window (${daysSinceTherapy} days since therapy, required >= ${washoutDays}).`,
      scoreDelta: -30,
      hardFailure: true,
    });
  }

  // -------------------------
  // Extraction helpers
  // -------------------------

  static extractMinimumAge(trial) {
    const raw = trial?.minimum_age;
    if (!raw) return null;

    const value = this.convertAgeToYears(raw);
    return Number.isFinite(value) ? value : null;
  }

  static extractMaximumAge(inclusionCriteria) {
    const text = inclusionCriteria.join(" ");

    // Example: "Age range: 25-49 years"
    let match = text.match(/age range:\s*(\d+)\s*[-–]\s*(\d+)/i);
    if (match) return Number(match[2]);

    // Example: "aged 25-49 years"
    match = text.match(/aged?\s*(\d+)\s*[-–]\s*(\d+)\s*years?/i);
    if (match) return Number(match[2]);

    return null;
  }

  static extractMaxECOG(inclusionCriteria) {
    const text = inclusionCriteria.join(" ");

    let match = text.match(/ecog.*?0\s*[-–]\s*(\d+)/i);
    if (match) return Number(match[1]);

    match = text.match(/ecog.*?(?:<=|≤)\s*(\d+)/i);
    if (match) return Number(match[1]);

    return null;
  }

  static extractMinPriorLines(inclusionCriteria) {
    const text = inclusionCriteria.join(" ");

    let match = text.match(
      /(?:≥|>=|at least)\s*(\d+)\s*prior lines of therapy/i
    );
    if (match) return Number(match[1]);

    match = text.match(/(\d+)\+?\s*prior lines of therapy/i);
    if (match) return Number(match[1]);

    return null;
  }

  static extractRecentTherapyWindowDays(text) {
    const match = text.match(/within\s*(\d+)\s*days/i);
    return match ? Number(match[1]) : null;
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
