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
                if (e.resource) entries.push(e.resource);
            }
        }
        const nextLink = (data?.link || []).find((l) => l.relation === 'next');
        url = nextLink?.url ? toRelative(nextLink.url, fhirBaseUrl) : null;
        pages += 1;
    }

    return entries;
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
        fetchPatient(fhirBaseUrl, accessToken, patientId),
        fetchCollection(fhirBaseUrl, accessToken, 'Condition',         patientId),
        fetchCollection(fhirBaseUrl, accessToken, 'Observation',       patientId),
        fetchCollection(fhirBaseUrl, accessToken, 'MedicationRequest', patientId),
        fetchCollection(fhirBaseUrl, accessToken, 'Procedure',         patientId),
    ]);

    return { patient, conditions, observations, medicationRequests, procedures };
}

module.exports = {
    fetchPatient,
    fetchCollection,
    fetchPatientBundle,
};
