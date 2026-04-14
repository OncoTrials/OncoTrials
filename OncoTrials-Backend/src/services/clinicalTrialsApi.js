// src/services/clinicalTrialsApi.js
const axios = require("axios");

const BASE_URL = process.env.CTGOV_BASE_URL || 
    "https://beta-ut.clinicaltrials.gov/api/v2/studies";
const POLITE_DELAY_MS = Number(process.env.CTGOV_POLL_DELAY_MS || 500);

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function fetchStudiesPage({ query = "", pageToken = null } = {}) {
    const params = {};
    if (query) params.q = query;
    if (pageToken) params.pageToken = pageToken;
    
    const url = Object.keys(params).length
        ? `${BASE_URL}?${new URLSearchParams(params)}`
        : BASE_URL;

    console.log("Fetching page:", url);
    const resp = await axios.get(url, { timeout: 60000 });
    const body = resp.data || {};
    
    return {
        studies: body.studies || [],
        nextPageToken: body.nextPageToken || null
    };
}

async function respectRateLimit() {
    await sleep(POLITE_DELAY_MS);
}

module.exports = { fetchStudiesPage, respectRateLimit };