// Minimal FHIR R4 REST client.
//
// Deliberately not a full FHIR SDK — we only need 5 read endpoints and the
// resource shapes are well-typed JSON. Easier to audit + smaller surface area.
//
// All calls go through a single axios instance with the patient-scoped access
// token. Patient data lives only in this module's call stacks; nothing is
// persisted or logged.

const axios = require('axios');

const REQUEST_TIMEOUT_MS = 8000;
const PAGE_LIMIT         = 5;     // safety cap on follow-the-`next`-link loops

function makeClient(fhirBaseUrl, accessToken) {
    const http = axios.create({
        baseURL: fhirBaseUrl.replace(/\/+$/, ''),
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept:        'application/fhir+json',
        },
    });
    return http;
}

async function fetchPatient(fhirBaseUrl, accessToken, patientId) {
    const http = makeClient(fhirBaseUrl, accessToken);
    const { data } = await http.get(`/Patient/${encodeURIComponent(patientId)}`);
    return data;   // Patient resource
}

async function fetchCollection(fhirBaseUrl, accessToken, resourceType, patientId, extraParams = {}) {
    const http = makeClient(fhirBaseUrl, accessToken);
    const params = new URLSearchParams({
        patient: patientId,
        _count:  '50',
        ...extraParams,
    });

    let url = `/${resourceType}?${params.toString()}`;
    const entries = [];
    let pages = 0;

    while (url && pages < PAGE_LIMIT) {
        const { data } = await http.get(url);
        if (Array.isArray(data?.entry)) {
            for (const e of data.entry) {
                // Epic bundles can interleave OperationOutcome entries with
                // real resources — keep only the type we asked for.
                if (e.resource?.resourceType === resourceType) entries.push(e.resource);
            }
        }
        const nextLink = (data?.link || []).find((l) => l.relation === 'next');
        url = nextLink?.url ? toRelative(nextLink.url, fhirBaseUrl) : null;
        pages += 1;
    }

    return entries;
}

// Epic's Observation.Search REQUIRES a category (or code) search parameter —
// a bare `Observation?patient=X` returns a 400/OperationOutcome on Epic even
// though it works on SMART Health IT and other reference sandboxes. Try the
// permissive query first (cheapest, works everywhere else), then fall back to
// one query per category, merged and de-duplicated by resource id.
//
// Categories chosen to cover what patientNormalizer reads: ECOG (survey /
// exam), cancer stage + genomics (laboratory), smoking status (social-history).
const OBSERVATION_CATEGORIES = ['laboratory', 'vital-signs', 'social-history', 'survey', 'exam', 'imaging'];

async function fetchObservations(fhirBaseUrl, accessToken, patientId) {
    try {
        return await fetchCollection(fhirBaseUrl, accessToken, 'Observation', patientId);
    } catch (err) {
        console.warn(`[fhirClient] uncategorized Observation search failed (${err?.response?.status || err?.message}); retrying per-category (Epic requires category)`);
    }

    const perCategory = await Promise.all(OBSERVATION_CATEGORIES.map(async (category) => {
        try {
            return await fetchCollection(fhirBaseUrl, accessToken, 'Observation', patientId, { category });
        } catch (err) {
            console.warn(`[fhirClient] Observation category=${category} search failed: ${err?.response?.status || err?.message}`);
            return [];
        }
    }));

    const seen = new Map();
    for (const obs of perCategory.flat()) {
        const key = obs.id || JSON.stringify(obs.code || {});
        if (!seen.has(key)) seen.set(key, obs);
    }
    return [...seen.values()];
}

// Non-critical collections should degrade to [] instead of failing the whole
// launch: a patient with a blocked MedicationRequest scope can still be
// matched on diagnosis + demographics. Patient itself stays fatal — without
// it there is nothing to match.
async function fetchOptional(label, promise) {
    try {
        return await promise;
    } catch (err) {
        console.warn(`[fhirClient] ${label} fetch failed (continuing without it): ${err?.response?.status || err?.message}`);
        return [];
    }
}

// EPIC's `next` link is absolute; strip the base so axios doesn't double-prepend.
function toRelative(absoluteUrl, fhirBaseUrl) {
    const base = fhirBaseUrl.replace(/\/+$/, '');
    return absoluteUrl.startsWith(base) ? absoluteUrl.slice(base.length) : absoluteUrl;
}

/**
 * Pull everything the patient normalizer cares about in one go. Runs the
 * sub-requests in parallel; total latency = slowest sub-request.
 *
 * We deliberately do NOT filter Condition or Observation by `category`:
 *   - SMART Health IT / Synthea-generated sandboxes commonly classify
 *     conditions as `encounter-diagnosis`, not `problem-list-item`. The
 *     category filter was silently dropping every cancer diagnosis in
 *     sandbox data.
 *   - Real EPIC deployments tend to use both categories; we let the
 *     patientNormalizer decide which conditions are oncology-relevant via
 *     code/text matching instead of relying on server-side categorization.
 */
async function fetchPatientBundle(fhirBaseUrl, accessToken, patientId) {
    const [patient, conditions, observations, medicationRequests, procedures] = await Promise.all([
        fetchPatient(fhirBaseUrl, accessToken, patientId),      // fatal if it fails — nothing to match without it
        fetchOptional('Condition',         fetchCollection(fhirBaseUrl, accessToken, 'Condition',         patientId)),
        fetchOptional('Observation',       fetchObservations(fhirBaseUrl, accessToken, patientId)),
        fetchOptional('MedicationRequest', fetchCollection(fhirBaseUrl, accessToken, 'MedicationRequest', patientId)),
        fetchOptional('Procedure',         fetchCollection(fhirBaseUrl, accessToken, 'Procedure',         patientId)),
    ]);

    return { patient, conditions, observations, medicationRequests, procedures };
}

module.exports = {
    fetchPatient,
    fetchCollection,
    fetchPatientBundle,
};
