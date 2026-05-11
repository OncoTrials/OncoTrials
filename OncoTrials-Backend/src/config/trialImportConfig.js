// src/config/trialImportConfig.js
//
// Centralised configuration for the trial import pipeline.
//
// Design decisions
// • Country list lives HERE (version-controlled, shared across envs).
// • .env can *override* the list via ALLOWED_COUNTRIES (comma-separated)
//   for quick ad-hoc runs without a code change.
// • Every consumer calls getAllowedCountries() so the resolution logic
//   is in one place.

// Default allowed countries
// Values must match what ClinicalTrials.gov returns in
// protocolSection.contactsLocationsModule.locations[].country
// (case-insensitive comparison is applied downstream).
const DEFAULT_ALLOWED_COUNTRIES = [
    "United States",
];

// Aliases
// Map of normalised lower-case aliases → canonical country name used by
// the CT.gov API.  Keeps the matching logic tolerant of minor variations
// without scattering string lists across files.
const COUNTRY_ALIASES = {
    "united states":            "United States",
    "united states of america": "United States",
    "us":                       "United States",
    "usa":                      "United States",
    // Add future countries and their aliases here, e.g.:
    // "uk":                    "United Kingdom",
    // "great britain":         "United Kingdom",
    // "united kingdom":        "United Kingdom",
    // "canada":                "Canada",
    // "ca":                    "Canada",
};

// Statuses considered closed / finished
const CLOSED_STATUSES = new Set([
    "COMPLETED",
    "TERMINATED",
    "WITHDRAWN",
    "SUSPENDED",
    "CLOSED_TO_ACCRUAL",
    "CLOSED_TO_ACCRUAL_AND_TREATMENT",
    "ACTIVE_NOT_RECRUITING",
]);

// Helpers

/**
 * Returns the active list of allowed countries.
 * Priority: ALLOWED_COUNTRIES env var → DEFAULT_ALLOWED_COUNTRIES.
 */
function getAllowedCountries() {
    const envVal = (process.env.ALLOWED_COUNTRIES || "").trim();
    if (envVal) {
        return envVal
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [...DEFAULT_ALLOWED_COUNTRIES];
}

/**
 * Build the Set of lower-cased country strings that should be accepted
 * during location filtering.  Includes canonical names + all aliases that
 * resolve to one of the currently-allowed countries.
 */
function buildAllowedCountrySet() {
    const allowed = new Set(getAllowedCountries().map((c) => c.toLowerCase()));
    const result = new Set(allowed);

    for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
        if (allowed.has(canonical.toLowerCase())) {
            result.add(alias);
        }
    }
    return result;
}

/**
 * Returns canonical country values suitable for the CT.gov
 * `query.locn` API parameter.
 */
function getAllowedCountriesForApi() {
    return getAllowedCountries();
}

module.exports = {
    DEFAULT_ALLOWED_COUNTRIES,
    COUNTRY_ALIASES,
    CLOSED_STATUSES,
    getAllowedCountries,
    buildAllowedCountrySet,
    getAllowedCountriesForApi,
};
