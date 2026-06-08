// postalDataset.js — resolves a postal code to coordinates using a bundled,
// offline dataset (no network call, no API cost). Datasets are lazy-loaded the
// first time a given country is needed, then cached in memory for the session.

// country code -> Promise that resolves to the loaded { postalCode: [...] } map.
// Storing the promise (not just the data) means concurrent first lookups share
// one fetch instead of triggering several.
const datasetLoadPromises = new Map();

function loadDataset(country) {
    if (!datasetLoadPromises.has(country.code)) {
        const loadPromise = fetch(country.postalDatasetUrl)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load ${country.code} postal dataset: ${res.status}`);
                return res.json();
            })
            .catch((err) => {
                // Don't cache a failed load — clear it so a later attempt can retry.
                datasetLoadPromises.delete(country.code);
                throw err;
            });
        datasetLoadPromises.set(country.code, loadPromise);
    }
    return datasetLoadPromises.get(country.code);
}

/**
 * Look up a postal code offline.
 *
 * @param {object} country   a SUPPORTED_COUNTRIES entry
 * @param {string} postalKey normalized postal key (from classifyInput)
 * @returns {Promise<{lat, lng, formattedAddress, countryCode}|null>} null if unknown
 */
export async function resolvePostal(country, postalKey) {
    const dataset = await loadDataset(country);
    const entry = dataset[postalKey];
    if (!entry) return null;

    // Dataset rows are compact arrays: [lat, lng, city, region].
    const [lat, lng, city, region] = entry;
    const placeParts = [city, region].filter(Boolean).join(', ');
    return {
        lat,
        lng,
        formattedAddress: placeParts ? `${placeParts} ${postalKey}` : postalKey,
        countryCode: country.code,
    };
}
