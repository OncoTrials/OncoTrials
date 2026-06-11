// photon.js — city/address autocomplete via Photon, an open-source geocoder
// built on OpenStreetMap data (https://photon.komoot.io). It's free and needs
// no API key, and crucially each suggestion already includes coordinates, so
// selecting one needs no follow-up lookup.
//
// Reliability note: the public endpoint is best-effort with no SLA. If we ever
// need guarantees, swap PHOTON_ENDPOINT for a self-hosted Photon container or a
// paid provider — this file is the only thing that changes.

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

// Builds a human-readable label from a Photon result's properties, e.g.
// "Beverly Hills, California, United States".
function buildLabel(properties) {
    const { name, city, state, country } = properties;
    // Avoid repeating the name when it's the same as the city.
    const parts = [name, city !== name ? city : null, state, country].filter(Boolean);
    return parts.join(', ');
}

/**
 * Fetch autocomplete suggestions for a partial city/address query.
 *
 * @param {string} query
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]        cancel a stale in-flight request
 * @param {number} [options.limit=5]            max suggestions to return
 * @param {string[]} [options.countryCodes]     lowercase codes to allow (others dropped)
 * @returns {Promise<Array<{label, lat, lng, countryCode}>>}
 */
export async function suggestPlaces(query, { signal, limit = 5, countryCodes } = {}) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`, { signal });
    if (!response.ok) throw new Error(`Photon request failed: ${response.status}`);

    const data = await response.json();
    const features = data.features || [];

    return features
        .map((feature) => {
            // GeoJSON coordinates are [longitude, latitude] — note the order.
            const [lng, lat] = feature.geometry?.coordinates || [];
            const properties = feature.properties || {};
            return {
                label: buildLabel(properties),
                lat,
                lng,
                countryCode: (properties.countrycode || '').toLowerCase(),
            };
        })
        // Drop anything missing coordinates or a label.
        .filter((s) => s.label && typeof s.lat === 'number' && typeof s.lng === 'number')
        // Restrict to the countries we support, if an allowlist was provided.
        .filter((s) => !countryCodes || countryCodes.includes(s.countryCode));
}
