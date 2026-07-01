import React from 'react';
import LocationFilter from '../filters/LocationFilter';
import { sortOptions } from '../../utils/trialCardUtils';

// Renders only the search/location/sort controls. Callers are responsible
// for the surrounding layout and for the result-count label, since that
// label should stay visible even if these controls are ever hidden (see
// FILTERS_ENABLED in TrialResultsView).
function SearchSortToolbar({
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showSortDropdown,
    setShowSortDropdown,
    setLocationFilter,
    viewResetKey,
}) {
    return (
        <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search box */}
                <div className="relative flex-1 sm:flex-none sm:w-64">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search trials…"
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700
                        focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all duration-200
                        placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Location filter (applies to browse-all and search results alike).
                The key remounts it on a view reset so its own input/UI clears
                too, matching the setLocationFilter(null) in the reset effect. */}
                <LocationFilter key={viewResetKey} onChange={setLocationFilter} />

                {/* Sort dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSortDropdown(prev => !prev)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700
                        hover:border-sky-300 hover:bg-sky-50 transition-all duration-200 whitespace-nowrap"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        {sortOptions.find(o => o.value === sortBy)?.label || 'Sort'}
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {showSortDropdown && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                            {sortOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortBy === opt.value
                                            ? 'bg-sky-50 text-sky-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
    );
}

export default SearchSortToolbar;