const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Fetches all trials from the Express backend in one request.
// The backend selects only list-view columns and caches the result for 5 minutes,
// so repeated calls within that window don't hit Supabase.
export async function getAllTrials() {
    const res = await fetch(`${API_BASE}/trials?limit=5000`);
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
