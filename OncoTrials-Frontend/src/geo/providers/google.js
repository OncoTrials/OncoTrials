// google.js — fallback resolver using the Google Geocoding API. Used only when
// the offline postal lookup and Photon suggestions don't cover an input (e.g. a
// free-text address the user typed and submitted without picking a suggestion).
//
// It's free under Google's monthly free tier and reuses the same key as the map
// embeds (VITE_GOOGLE_API_KEY). Kept deliberately small since it's a backstop.

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

/**
 * Geocode free text via Google.
 *
 * @param {string} input
 * @returns {Promise<{lat, lng, formattedAddress, countryCode}|null>}
 *   null when Google finds no match (ZERO_RESULTS). Throws on configuration or
 *   quota problems (e.g. REQUEST_DENIED) so they surface instead of looking like
 *   "not found".
 */
export async function resolveWithGoogle(input) {
    if (!GOOGLE_API_KEY) return null; // no key configured → nothing to fall back to

    const params = new URLSearchParams({ address: input, key: GOOGLE_API_KEY });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!response.ok) throw new Error(`Geocoding request failed: ${response.status}`);

    const data = await response.json();
    if (data.status === 'ZERO_RESULTS' || !data.results?.length) return null;
    if (data.status !== 'OK') {
        console.error('[resolveWithGoogle] Google rejected the request:', data.status, data.error_message);
        throw new Error(`Geocoding error: ${data.status}${data.error_message ? ` (${data.error_message})` : ''}`);
    }

    const best = data.results[0];
    // Pull the ISO country code out of the address components, if present.
    const countryComponent = best.address_components?.find((c) => c.types.includes('country'));
    return {
        lat: best.geometry.location.lat,
        lng: best.geometry.location.lng,
        formattedAddress: best.formatted_address,
        countryCode: (countryComponent?.short_name || '').toLowerCase(),
    };
}
