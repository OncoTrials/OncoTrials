// classifyInput.js — decides what a user's location text is, so the right
// resolver can handle it: a known country's postal code (resolved offline) or
// free text like a city/address (resolved via suggestions).

import { SUPPORTED_COUNTRIES } from './countries';

/**
 * Classify a raw location string.
 *
 * @param {string} rawInput
 * @returns {{ type: 'postal', country: object, postalKey: string }
 *          | { type: 'freetext', value: string }}
 *   - "postal": matched a supported country's postal pattern. `country` is the
 *     registry entry; `postalKey` is the normalized key to look up in its dataset.
 *   - "freetext": anything else (city, address, partial text).
 */
export function classifyInput(rawInput) {
    const trimmed = (rawInput || '').trim();

    for (const country of SUPPORTED_COUNTRIES) {
        const match = trimmed.match(country.postalPattern);
        if (match) {
            return { type: 'postal', country, postalKey: country.normalizePostal(match) };
        }
    }

    return { type: 'freetext', value: trimmed };
}
