import { useMemo } from 'react';
import {filterTrialsByDistance} from '../geo'
// import { filterTrialsByDistance } from '../../../geo';

// Applies location filtering, keyword search, and sorting to a raw trial
// list. Kept as a pure derivation (inputs -> output) so it's easy to reason
// about and test independently of the component tree.
//
// NOTE: these should only act once the stream has finished (streamDone) if
// FILTERS_ENABLED is ever toggled off, otherwise they filter/sort against a
// partially-loaded list. See TrialCards.jsx for the FILTERS_ENABLED flag.
export function useProcessedTrials(trials, { searchQuery, sortBy, locationFilter, filtersEnabled = true }) {
    return useMemo(() => {
        if (!trials || trials.length === 0) return trials;

        if (!filtersEnabled) return trials;

        let result = [...trials];

        // Location: keep only trials within the chosen radius of the origin.
        if (locationFilter) {
            result = filterTrialsByDistance(
                result,
                locationFilter.lat,
                locationFilter.lng,
                locationFilter.radius,
                locationFilter.unit,
            );
        }

        // Keyword search
        if (searchQuery.trim()) {
            const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
            const scored = result.map(trial => {
                const searchable = [
                    trial.title,
                    trial.nct_id,
                    trial.sponsor,
                    trial.summary,
                    trial.eligibility_criteria_summary,
                    trial.location_city,
                    trial.location_state,
                    ...(trial.conditions || []),
                ].filter(Boolean).join(' ').toLowerCase();

                const matchCount = terms.filter(term => searchable.includes(term)).length;
                return { trial, matchCount };
            });

            result = scored
                .filter(s => s.matchCount > 0)
                .sort((a, b) => b.matchCount - a.matchCount)
                .map(s => s.trial);
        }

        // Sort (only when not searching — search results are ranked by relevance).
        // Sorted by start_date, NOT created_at: created_at is the database import
        // timestamp (nearly identical across the bulk import), so it gives no
        // meaningful newest/oldest order. Trials with no start_date sort last.
        if (!searchQuery.trim()) {
            const startDate = (trial) => trial.start_date || '';
            switch (sortBy) {
                case 'newest':
                    result.sort((a, b) => {
                        const aDate = startDate(a), bDate = startDate(b);
                        if (aDate === bDate) return 0;
                        if (!aDate) return 1;
                        if (!bDate) return -1;
                        return bDate.localeCompare(aDate);
                    });
                    break;
                case 'oldest':
                    result.sort((a, b) => {
                        const aDate = startDate(a), bDate = startDate(b);
                        if (aDate === bDate) return 0;
                        if (!aDate) return 1;
                        if (!bDate) return -1;
                        return aDate.localeCompare(bDate);
                    });
                    break;
                case 'ending-soon':
                    result.sort((a, b) => {
                        const dateA = a.completion_date || a.primary_completion_date || '9999';
                        const dateB = b.completion_date || b.primary_completion_date || '9999';
                        return String(dateA).localeCompare(String(dateB));
                    });
                    break;
                case 'az':
                    result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    break;
                case 'za':
                    result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                    break;
            }
        }

        return result;
    }, [trials, searchQuery, sortBy, locationFilter, filtersEnabled]);
}