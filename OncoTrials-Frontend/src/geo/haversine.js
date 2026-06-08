// haversine.js — great-circle distance between two lat/lng points, and a helper
// that filters a list of trials to those within a radius of an origin point.
//
// "Haversine" is the standard formula for the distance between two points on a
// sphere given their latitude/longitude. It's accurate enough for "trials
// within X miles of me" and needs no external service.

const EARTH_RADIUS_MILES = 3958.8;
const EARTH_RADIUS_KM    = 6371.0;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Distance between two coordinates.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @param {'miles'|'km'} unit
 * @returns {number} distance in the requested unit
 */
export function haversineDistance(lat1, lng1, lat2, lng2, unit = 'miles') {
    const earthRadius = unit === 'km' ? EARTH_RADIUS_KM : EARTH_RADIUS_MILES;

    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

/**
 * Keeps only the trials within `radius` of an origin point, and tags each kept
 * trial with how far away it is (`_distance`) for optional display/sorting.
 * Trials without usable coordinates are dropped.
 *
 * @param {Array} trials       trials, each expected to have latitude/longitude
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} radius      radius in the given unit
 * @param {'miles'|'km'} unit
 * @returns {Array} filtered trials, each with a numeric `_distance`
 */
export function filterTrialsByDistance(trials, originLat, originLng, radius, unit = 'miles') {
    return trials
        .map((trial) => {
            const lat = parseFloat(trial.latitude);
            const lng = parseFloat(trial.longitude);
            if (isNaN(lat) || isNaN(lng)) return null; // no coordinates → can't measure

            const distance = haversineDistance(originLat, originLng, lat, lng, unit);
            return distance <= radius
                ? { ...trial, _distance: Math.round(distance * 10) / 10 }
                : null;
        })
        .filter(Boolean);
}
