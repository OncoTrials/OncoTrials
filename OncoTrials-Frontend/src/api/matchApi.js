// matchApi.js — client for /api/v1/match.
//
// The match endpoint expects a Bearer token. For the SMART-launch flow that
// token comes from the EPIC callback's URL fragment (sessionStorage'd here so
// it survives a navigation). For internal/dev callers it should come from
// Supabase Auth — pass it explicitly.

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const SESSION_TOKEN_KEY = 'oncotrials.smart.token';
const SESSION_RID_KEY   = 'oncotrials.smart.rid';

export function storeSmartSession({ token, rid }) {
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    if (rid)   sessionStorage.setItem(SESSION_RID_KEY, rid);
}
export function clearSmartSession() {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_RID_KEY);
}
export function getSmartToken() {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
}

/**
 * Request a ranked match. SMART-launch callers should pass an empty patient
 * body — the backend pulls the cached normalized patient from the FHIR
 * context store using the JWT's request-id claim.
 */
export async function requestMatch({ token, patient = null, limit = 20, refresh = false } = {}) {
    const url = `${API_BASE}/api/v1/match${refresh ? '?refresh=1' : ''}`;
    const body = patient ? { patient, limit } : { limit };

    const res = await fetch(url, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${token || getSmartToken() || ''}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Match request failed (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
}
