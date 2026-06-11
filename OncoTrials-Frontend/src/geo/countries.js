// countries.js — the registry of countries whose postal codes we can resolve
// offline. This is the single place to edit when adding a new country.
//
// To add Canada, for example, build its dataset
// (`node scripts/build-postal-dataset.mjs CA`) and add an entry below with its
// postal-code pattern. Nothing else in the geo module or the UI needs to change.

export const SUPPORTED_COUNTRIES = [
    {
        code: 'us',
        label: 'United States',
        // Matches a 5-digit ZIP, optionally with the "+4" suffix (which we ignore
        // and resolve at the 5-digit level). Capture group 1 is the 5-digit base.
        postalPattern: /^(\d{5})(?:-\d{4})?$/,
        // Lazy-loaded static asset built by scripts/build-postal-dataset.mjs.
        postalDatasetUrl: '/geo/us-postal.json',
        // Turns a matched input into the exact key used in the dataset.
        normalizePostal: (match) => match[1],
    },

    // Canada (enable when its dataset is built)
    // {
    //     code: 'ca',
    //     label: 'Canada',
    //     postalPattern: /^([A-Za-z]\d[A-Za-z])\s?\d[A-Za-z]\d$/, // FSA-level precision
    //     postalDatasetUrl: '/geo/ca-postal.json',
    //     normalizePostal: (match) => match[1].toUpperCase(),
    // },
];

// Country codes we let through in autocomplete suggestions, lowercased to match
// the `countrycode` field Photon returns. Derived from the registry so it grows
// automatically as countries are added.
export const SUGGESTION_COUNTRY_CODES = SUPPORTED_COUNTRIES.map((c) => c.code);
