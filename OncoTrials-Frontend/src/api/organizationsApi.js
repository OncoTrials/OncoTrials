const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export async function getOrganizationName(organizationId) {
  const res = await fetch(`${API_BASE}/organizations/organization-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });
  if (!res.ok)
    throw new Error(`Failed to fetch organization name (${res.status})`);
  return res.json();
}
