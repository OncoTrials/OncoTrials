// src/services/clinicalTrialsApi.js
const axios = require("axios");
const { getAllowedCountriesForApi } = require('../config/trialImportConfig');

const BASE_URL = process.env.CTGOV_BASE_URL ||
    "https://clinicaltrials.gov/api/v2/studies";
const POLITE_DELAY_MS = Number(process.env.CTGOV_POLL_DELAY_MS || 500);

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build the server-side location filter string for the CT.gov v2 API.
 * Produces: SEARCH[Location](AREA[LocationCountry]United States)
 * or for multiple countries an OR-joined expression.
 */
function buildLocationFilter(countries) {
    if (!countries || countries.length === 0) return null;
    if (countries.length === 1) {
        return `SEARCH[Location](AREA[LocationCountry]${countries[0]})`;
    }
    // Multiple countries: OR them together
    const parts = countries.map((c) => `AREA[LocationCountry]${c}`);
    return `SEARCH[Location](${parts.join(" OR ")})`;
}

async function fetchStudiesPage({ query = "", pageToken = null, lastUpdatePostDate = null } = {}) {
    const params = {};
    if (pageToken) params.pageToken = pageToken;

    // Build the query term
    let term = query || "";
    if (lastUpdatePostDate) {
        // Use Essie syntax for date range: AREA[LastUpdatePostDate]RANGE[YYYY-MM-DD, MAX]
        const dateFilter = `AREA[LastUpdatePostDate]RANGE[${lastUpdatePostDate}, MAX]`;
        term = term ? `(${term}) AND ${dateFilter}` : dateFilter;
    }
    if (term) params["query.term"] = term;

    // Always sort by last update to get newest first (helps with incremental sync)
    params.sort = "LastUpdatePostDate:desc";

    // Server-side country filter built from config
    const countries = getAllowedCountriesForApi();
    const locnFilter = buildLocationFilter(countries);
    if (locnFilter) {
        params["query.locn"] = locnFilter;
    }

    const url = Object.keys(params).length
        ? `${BASE_URL}?${new URLSearchParams(params)}`
        : BASE_URL;

    console.log("Fetching page:", url);
    const resp = await axios.get(url, { timeout: 60000 });
    const body = resp.data || {};

    return {
        studies: body.studies || [],
        nextPageToken: body.nextPageToken || null,
    };
}

async function respectRateLimit() {
    await sleep(POLITE_DELAY_MS);
}

module.exports = { fetchStudiesPage, respectRateLimit };
