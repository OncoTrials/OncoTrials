import supabase from "../utils/SupabaseClient";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// The authenticated user's verified organization ({ id, name }), or null when
// the account doesn't verifiably belong to one. The backend derives this from
// the JWT's email domain — unlike user_metadata.organization_id it can't be
// spoofed client-side, so it's safe to gate edit affordances on.
export async function getMyOrganization() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const res = await fetch(`${API_BASE}/organizations/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok)
    throw new Error(`Failed to fetch organization (${res.status})`);
  return res.json();
}
