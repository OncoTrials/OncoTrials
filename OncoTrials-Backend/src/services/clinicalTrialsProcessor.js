// src/services/clinicalTrialsProcessor.js

const {
    CLOSED_STATUSES,
    buildAllowedCountrySet,
} = require('../config/trialImportConfig');

// Gene list for naive biomarker extraction
const GENE_SYMBOLS = [
    "KRAS", "NRAS", "HRAS", "EGFR", "HER2", "ERBB2",
    "NTRK1", "NTRK2", "NTRK3", "BRAF", "ALK", "ROS1",
    "PIK3CA", "PTEN", "TP53", "MET", "RET", "KIT", "PDGFRA",
];
const GENE_REGEX = new RegExp(`\\b(${GENE_SYMBOLS.join("|")})\\b`, "gi");

// Date helpers

function parseDateString(s) {
    if (!s) return null;
    try {
        const d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    } catch {
        return null;
    }
}

function isDateInPast(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return d.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
}

// Biomarker extraction

function extractBiomarkersFromText(text) {
    if (!text || typeof text !== "string") return null;
    const matches = Array.from(
        new Set((text.match(GENE_REGEX) || []).map((m) => m.toUpperCase()))
    );
    if (matches.length === 0) return null;
    return matches.join(", ");
}

// Country / location helpers

function getLocationCountry(loc) {
    return (
        loc.facility?.address?.country ||
        loc.country ||
        ""
    ).toString().toLowerCase().trim();
}

/**
 * Returns true when at least one location belongs to an allowed country.
 */
function hasAllowedLocation(locations) {
    if (!Array.isArray(locations) || locations.length === 0) return false;
    const allowed = buildAllowedCountrySet();
    return locations.some((loc) => allowed.has(getLocationCountry(loc)));
}

/**
 * Filters a locations array down to only entries in allowed countries.
 */
function filterAllowedLocations(locations) {
    if (!Array.isArray(locations)) return [];
    const allowed = buildAllowedCountrySet();
    return locations.filter((loc) => allowed.has(getLocationCountry(loc)));
}

// Core row formatter

function formatStudyToTrialRow(study) {
    const ps = study.protocolSection || {};
    const idm = ps.identificationModule || {};
    const sm = ps.statusModule || {};
    const dm = ps.descriptionModule || {};
    const cm = ps.conditionsModule || {};
    const em = ps.eligibilityModule || {};
    const clm = ps.contactsLocationsModule || {};

    const nct_id = idm.nctId || null;

    const sponsor =
        ps.sponsorCollaboratorsModule?.leadSponsor?.name ||
        ps.sponsorCollaboratorsModule?.leadSponsor?.agency ||
        (idm.organization && idm.organization.fullName) || null;

    const organization = (idm.organization && idm.organization.fullName) || null;
    const title = idm.briefTitle || idm.officialTitle || null;
    const summary = dm.briefSummary || dm.detailedDescription || null;
    const lastKnownStatus = sm.lastKnownStatus || sm.overallStatus || null;
    const conditions = cm.conditions && Array.isArray(cm.conditions) ? cm.conditions : null;
    const sex = em.sex || null;
    const minimumAge = em.minimumAge || null;

    const allLocations = clm.locations && Array.isArray(clm.locations) ? clm.locations : null;

    // Keep only locations in allowed countries
    const allowedLocations = filterAllowedLocations(allLocations || []);
    const locations = allowedLocations.length > 0 ? allowedLocations : null;

    let location_city = null, location_state = null, location_country = null;
    let latitude = null, longitude = null;

    if (allowedLocations.length > 0) {
        const loc = allowedLocations[0];
        location_city = loc.facility?.address?.city || loc.city || null;
        location_state = loc.facility?.address?.state || loc.state || null;
        location_country = loc.facility?.address?.country || loc.country || null;

        const geo = loc.geoPoint || loc.facility?.geoPoint || null;
        if (geo) {
            latitude = typeof geo.lat === "number" ? geo.lat : geo.latitude || null;
            longitude = typeof geo.lon === "number" ? geo.lon : geo.longitude || geo.lng || null;
        }
    }

    const start_date = parseDateString(sm.startDateStruct?.date || null);
    const primary_completion_date = parseDateString(sm.primaryCompletionDateStruct?.date || null);
    const completion_date = parseDateString(sm.completionDateStruct?.date || null);

    const isClosed = CLOSED_STATUSES.has((lastKnownStatus || "").toString().toUpperCase());
    const closed_at = isClosed ? completion_date || primary_completion_date || null : null;

    const eligText =
        (em.eligibilityCriteria && (em.eligibilityCriteria.textblock || em.eligibilityCriteria)) ||
        em.criteria?.textblock || dm.detailedDescription || dm.briefSummary || null;

    const biomarker_criteria = extractBiomarkersFromText(eligText) || null;
    const source_version = study.versionHolder || study.version || null;

    return {
        nct_id, sponsor, organization, title, summary, status: lastKnownStatus,
        study_description: dm.detailedDescription || null, conditions, sex,
        minimum_age: minimumAge, location_city, location_state, location_country,
        latitude, longitude, locations, eligibility_criteria: eligText,
        biomarker_criteria, start_date, primary_completion_date, completion_date,
        closed_at, source: "clinicaltrials.gov", source_version,
        last_fetched_at: new Date().toISOString(),
    };
}

// Change detection
// Fields we compare between remote and local to decide if an update is
// warranted.  last_fetched_at is always written regardless.
const TRACKED_FIELDS = [
    "status", "summary", "study_description", "title", "sponsor",
    "primary_completion_date", "completion_date", "closed_at",
    "location_city", "location_state", "location_country",
    "biomarker_criteria", "eligibility_criteria", "conditions",
];

/**
 * Compare a freshly-fetched row against the existing DB record and return
 * an object with only the fields that actually changed, plus
 * `last_fetched_at`.  Returns `null` when nothing meaningful changed
 * (caller should still bump last_fetched_at if desired).
 */
function buildUpdatePayload(row, existing) {
    const payload = { last_fetched_at: row.last_fetched_at };
    let hasChange = false;

    for (const field of TRACKED_FIELDS) {
        const remote = normaliseForComparison(row[field]);
        const local  = normaliseForComparison(existing[field]);

        if (remote !== local) {
            payload[field] = row[field] ?? null;
            hasChange = true;
        }
    }

    return { payload, hasChange };
}

/** Stringify values so that `null`, `undefined`, arrays, etc. compare reliably. */
function normaliseForComparison(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return JSON.stringify(val);
    return String(val).trim();
}

// Skip logic
function shouldSkipNewTrial(trial) {
    const isClosedByStatus = CLOSED_STATUSES.has((trial.status || "").toString().toUpperCase());
    const primaryDone = isDateInPast(trial.primary_completion_date);
    const completionDone = isDateInPast(trial.completion_date);

    return isClosedByStatus || primaryDone || completionDone;
}

module.exports = {
    formatStudyToTrialRow,
    shouldSkipNewTrial,
    hasAllowedLocation,
    filterAllowedLocations,
    buildUpdatePayload,
    CLOSED_STATUSES,
};
