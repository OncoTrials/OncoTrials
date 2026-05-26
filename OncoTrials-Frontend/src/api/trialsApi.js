const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Fetches every trial in one response. Backend transparently paginates
// Supabase (1000 rows at a time, since PostgREST caps single responses) on
// the first request after a cache version change, then serves the cached
// union from Redis (24h TTL) for every subsequent request. So this is fast
// even though it returns ~24K rows.
export async function getAllTrials() {
    const res = await fetch(`${API_BASE}/trials?limit=all`);
    if (!res.ok) throw new Error(`Failed to fetch trials: ${res.status}`);
    const { data } = await res.json();
    return data ?? [];
}

// Fetches a single trial's full detail (all columns) by its UUID.
export async function getTrialById(id) {
    const res = await fetch(`${API_BASE}/trials/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch trial ${id}: ${res.status}`);
    return res.json();
}
