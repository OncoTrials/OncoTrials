// geo/index.js — the public interface the UI uses for location search.
//
// Two entry points:
//   suggestLocations(query, { signal }) — type-ahead suggestions for cities/
//       addresses (free text). Postal codes don't need suggestions.
//   resolveLocation(input) — turn a final input into one { lat, lng, ... }.
//       Postal codes resolve offline; free text falls back to Google.
//
// Also re-exports the distance helpers so callers have a single geo import.

import { classifyInput } from './classifyInput';
import { SUGGESTION_COUNTRY_CODES } from './countries';
import { resolvePostal } from './providers/postalDataset';
import { suggestPlaces } from './providers/photon';
import { resolveWithGoogle } from './providers/google';

export { haversineDistance, filterTrialsByDistance } from './haversine';

// How many characters before we bother asking for suggestions.
export const MIN_SUGGEST_LENGTH = 3;

/**
 * Suggestions for the autocomplete dropdown. Returns [] for postal-code input
 * (those resolve instantly offline, no dropdown needed) and for very short text.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<{label, lat, lng, countryCode}>>}
 */
export async function suggestLocations(query, { signal } = {}) {
    const classified = classifyInput(query);
    if (classified.type === 'postal') return [];
    if (classified.value.length < MIN_SUGGEST_LENGTH) return [];

    return suggestPlaces(classified.value, {
        signal,
        countryCodes: SUGGESTION_COUNTRY_CODES,
    });
}

/**
 * Resolve a final input to a single location.
 *
 * @param {string} input
 * @returns {Promise<{lat, lng, formattedAddress, countryCode}>}
 * @throws {Error('Location not found')} when nothing matches.
 */
export async function resolveLocation(input) {
    const classified = classifyInput(input);

    // Postal code → offline dataset first.
    if (classified.type === 'postal') {
        const fromDataset = await resolvePostal(classified.country, classified.postalKey);
        if (fromDataset) return fromDataset;
        // Not in our dataset — fall through to Google with the original text.
    }

    // Free text (or an unmatched postal code) → Google fallback.
    const fromGoogle = await resolveWithGoogle(input.trim());
    if (fromGoogle) return fromGoogle;

    throw new Error('Location not found');
}
