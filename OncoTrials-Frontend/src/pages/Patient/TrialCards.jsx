import React, { useState, useEffect, useMemo } from 'react';
import ViewDetailsButtons from '../../components/buttons/ViewDetailsButtons';
import LocationFilter from '../../components/filters/LocationFilter';
import { getTrialById } from '../../api/trialsApi';
import { filterTrialsByDistance } from '../../geo';

// Skeleton Card
function SkeletonCard() {
    return (
        <div className="relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-1.5 w-full bg-gray-200" />
            <div className="flex flex-col flex-1 p-5 gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="h-6 w-24 bg-gray-200 rounded-lg" />
                    <div className="h-8 w-24 bg-gray-200 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// `viewResetKey` is a number supplied by the parent. It changes every time the
// user starts a new view of the results (runs a sidebar search, resets the
// form, or clicks "Browse All"). When it changes we clear the in-card keyword
// search and jump back to the first page so each new view starts clean.
function TrialCards({ trials, isLoading, trialsError = false, browseAllPending = false, onShowAll, onRetry, streamingTotal = 0, streamDone = false, viewResetKey = 0 }) {
    const [modalData, setModalData] = useState(null);       // partial data (list columns)
    const [fullModalData, setFullModalData] = useState(null); // full data (detail fetch)
    const [modalDetailLoading, setModalDetailLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [pageInput, setPageInput] = useState('1');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    // Active distance filter from the toolbar LocationFilter, or null. Applies to
    // whatever list is shown (browse-all or eligibility search results), so it
    // works the same in both. { lat, lng, formattedAddress, radius, unit }
    const [locationFilter, setLocationFilter] = useState(null);

    // Sync input with actual page when page changes via Next/Prev buttons
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    // Search + Sort
    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'ending-soon', label: 'Ending Soonest' },
        { value: 'az', label: 'A → Z' },
        { value: 'za', label: 'Z → A' },
    ];

    // Temporarily hide the in-toolbar filter controls (keyword search, location,
    // sort) while keeping all of their state and logic intact. Flip to true to
    // restore them. NOTE for when re-enabling: these should only act once the
    // stream has finished (streamDone), otherwise they filter/sort against a
    // partially-loaded list and the visible results keep changing as more
    // batches arrive. The cleanest fix is to render this block only when
    // `streamDone` is true (and/or skip filtering in processedTrials until then).
    const FILTERS_ENABLED = false;

    const processedTrials = useMemo(() => {
        if (!trials || trials.length === 0) return trials;

        // Filters disabled: show the list as-is (its natural stream order), with
        // no keyword/location/sort applied. Re-enabling FILTERS_ENABLED restores
        // the full pipeline below.
        if (!FILTERS_ENABLED) return trials;

        let result = [...trials];

        // Location: keep only trials within the chosen radius of the origin.
        // Applies regardless of how the list was produced (browse-all or search).
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
            // Score each trial: +2 for each matched term, higher = better
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

            // Only keep trials that match at least one term
            result = scored
                .filter(s => s.matchCount > 0)
                .sort((a, b) => b.matchCount - a.matchCount) // full matches first
                .map(s => s.trial);
        }

        // Sort (only when not searching — search results are ranked by relevance).
        // We sort by the trial's real start_date, NOT created_at: created_at is the
        // database import timestamp (nearly identical across the bulk import), so it
        // gives no meaningful newest/oldest order. Trials with no start_date sort last.
        if (!searchQuery.trim()) {
            const startDate = (trial) => trial.start_date || '';
            switch (sortBy) {
                case 'newest':
                    result.sort((a, b) => {
                        const aDate = startDate(a), bDate = startDate(b);
                        if (aDate === bDate) return 0;
                        if (!aDate) return 1;   // missing dates go last
                        if (!bDate) return -1;
                        return bDate.localeCompare(aDate); // most recent first
                    });
                    break;
                case 'oldest':
                    result.sort((a, b) => {
                        const aDate = startDate(a), bDate = startDate(b);
                        if (aDate === bDate) return 0;
                        if (!aDate) return 1;   // missing dates go last
                        if (!bDate) return -1;
                        return aDate.localeCompare(bDate); // earliest first
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
    }, [trials, searchQuery, sortBy, locationFilter, FILTERS_ENABLED]);

    // Reset page when search/sort/location changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, locationFilter]);

    // When the parent signals a brand-new results view (search / reset / browse
    // all), clear the keyword search box and return to the first page. Without
    // this, e.g. clicking Reset then Browse All would keep the old typed query
    // and leave the user stranded on whatever page they were viewing before.
    useEffect(() => {
        setSearchQuery('');
        setCurrentPage(1);
        setLocationFilter(null);
    }, [viewResetKey]);

    const trialsPerPage = 12;
    const totalPages = Math.ceil((processedTrials?.length ?? 0) / trialsPerPage);
    const startIndex = (currentPage - 1) * trialsPerPage;
    const paginatedData = processedTrials?.slice(startIndex, startIndex + trialsPerPage) ?? [];

    const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
    const handleNextPage    = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

    const handleRetry = async () => {
        if (!onRetry) return;
        setRetrying(true);
        try { await onRetry(); } finally { setRetrying(false); }
    };

    // Fetch full trial detail when modal opens
    useEffect(() => {
        if (!modalData?.id) return;
        setModalDetailLoading(true);
        setFullModalData(null);
        setSelectedLocation(null);
        getTrialById(modalData.id)
            .then(data => {
                setFullModalData(data);
                setSelectedLocation(data.locations?.[0] ?? null);
            })
            .catch(() => setFullModalData(modalData)) // fallback to partial data
            .finally(() => setModalDetailLoading(false));
    }, [modalData?.id]);

    const openModal = (trial) => {
        setModalData(trial);
        setFullModalData(null);
        setSelectedLocation(null);
    };
    const closeModal = () => {
        setModalData(null);
        setFullModalData(null);
        setSelectedLocation(null);
    };

    // displayData merges full (when ready) over partial
    const displayData = fullModalData ?? modalData;

    const convertStatus = (status) => {
        if (!status) return 'Unavailable';
        switch (status.toLowerCase()) {
            case 'recruiting':              return 'Recruiting';
            case 'not_yet_recruiting':      return 'Not Yet Recruiting';
            case 'active_not_recruiting':   return 'Active Not Recruiting';
            case 'enrolling_by_invitation': return 'Enrolling By Invitation';
            default:                        return 'Unavailable';
        }
    };

    const getStatusColor = (status) => {
        if (!status) return 'bg-red-100 text-red-700';
        switch (status.toLowerCase()) {
            case 'recruiting':              return 'bg-green-100 text-green-700';
            case 'not_yet_recruiting':      return 'bg-yellow-100 text-yellow-700';
            case 'active_not_recruiting':   return 'bg-gray-100 text-gray-600';
            case 'enrolling_by_invitation': return 'bg-blue-100 text-blue-700';
            default:                        return 'bg-red-100 text-red-700';
        }
    };

    const getStatusDot = (status) => {
        if (!status) return 'bg-red-400';
        switch (status.toLowerCase()) {
            case 'recruiting':              return 'bg-green-500 animate-pulse';
            case 'not_yet_recruiting':      return 'bg-yellow-500';
            case 'active_not_recruiting':   return 'bg-gray-400';
            case 'enrolling_by_invitation': return 'bg-blue-500 animate-pulse';
            default:                        return 'bg-red-400';
        }
    };

    const formatDate = (date) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const getMatchStyle = (match) => {
        switch (match?.status) {
            case 'likely_eligible': return { bar: 'bg-green-400',  badge: 'bg-green-100 text-green-700 border-green-200',  text: 'Likely Eligible' };
            case 'eligible':        return { bar: 'bg-green-400',  badge: 'bg-green-100 text-green-700 border-green-200',  text: 'Eligible' };
            case 'needs_review':    return { bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 border-amber-200',  text: 'Needs Review' };
            case 'not_eligible':    return { bar: 'bg-red-400',    badge: 'bg-red-100 text-red-700 border-red-200',        text: 'Not Eligible' };
            default:                return { bar: 'bg-sky-200',    badge: '',                                              text: '' };
        }
    };

    const cleanEligibilitySummary = (summary) => {
        if (!summary) return '';
        return summary.replace(/##\s*/g, '').trim();
    };

    // No search performed yet — show instructional prompt immediately (even while loading)
    if (trials === null) {
        // User clicked Browse All (or search) while loading — now show loading or error
        if (browseAllPending) {
            if (trialsError) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[750px] gap-4 text-center px-8">
                        <div className="flex flex-col gap-2 max-w-sm">
                            <p className="text-lg font-semibold text-red-600">Failed to load trials</p>
                            <p className="text-sm text-gray-500">Something went wrong while fetching trial data. Please try again later.</p>
                        </div>
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors duration-200 cursor-pointer shadow-sm"
                        >
                            {retrying && (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            )}
                            {retrying ? 'Retrying…' : 'Try Again'}
                        </button>
                    </div>
                );
            }
            return (
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            Loading trials…
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            );
        }

        // Default: show instructional content right away
        return (
            <div className="flex flex-col items-center justify-center min-h-[750px] gap-8 px-8 py-12">
                <div className="flex flex-col gap-2 text-center max-w-lg">
                    <h2 className="text-2xl font-bold text-gray-800">Find Your Clinical Trial</h2>
                    <p className="text-gray-500 leading-relaxed">
                        Use the search form on the left to find trials matched to your profile.
                        Fill in as many fields as you can for the most accurate results.
                    </p>
                </div>

                {/* Field guidance cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-sm">
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="font-semibold text-sky-800">Cancer Type <span className="text-red-500">*</span></span>
                        <p className="text-sky-700 leading-relaxed">
                            Enter a cancer type in plain language — e.g. <em>Lung</em>, <em>Breast</em>,
                            <em> Colorectal</em>, or a specific subtype like <em>Non-Small Cell Lung Cancer</em>
                            or <em>Triple-Negative Breast Cancer</em>.
                        </p>
                    </div>

                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="font-semibold text-violet-800">Mutation or Biomarker</span>
                        <p className="text-violet-700 leading-relaxed">
                            Enter any known genetic mutations or biomarkers from your pathology report —
                            e.g. <em>EGFR</em>, <em>KRAS G12C</em>, <em>HER2</em>, <em>BRAF V600E</em>,
                            or <em>ALK</em>. Leave blank if unknown.
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="font-semibold text-amber-800">Line of Treatment</span>
                        <p className="text-amber-700 leading-relaxed">
                            Specify whether you are seeking a first-line, second-line, or later-line
                            treatment option. Trials often restrict enrollment by prior therapy count.
                        </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="font-semibold text-emerald-800">Trial Status</span>
                        <p className="text-emerald-700 leading-relaxed">
                            Select <em>Recruiting</em> to see only trials currently enrolling patients.
                            Leave blank to include trials in all active phases.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-400">Prefer to explore without filtering?</p>
                    <button
                        onClick={onShowAll}
                        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 cursor-pointer shadow-sm"
                    >
                        Browse All Trials
                    </button>
                </div>
            </div>
        );
    }

    // Search returned no matches
    if (trials.length === 0) {
        if (!streamDone) {
            return (
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            Loading trials…
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[750px] gap-3 text-center px-8">
                <p className="text-lg font-medium text-gray-600">No trials matched your search criteria.</p>
                <p className="text-sm text-gray-400">Try broadening your filters or adjusting the cancer type.</p>
            </div>
        );
    }

    // Results
    return (
        <div className="p-4 flex flex-col gap-4">
            {/* Search + Sort toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Result count + streaming indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium">
                        {processedTrials?.length?.toLocaleString() ?? 0} trial{(processedTrials?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {!streamDone && streamingTotal > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            Loading more…
                        </span>
                    )}
                </div>

                {FILTERS_ENABLED && (
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
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                            sortBy === opt.value
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
                )}
            </div>

            {/* Card grid, or an empty-state when the active filters match nothing */}
            {processedTrials.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[550px] gap-2 text-center px-8">
                    <p className="text-base font-medium text-gray-600">No trials match your current filters.</p>
                    <p className="text-sm text-gray-400">
                        {locationFilter
                            ? `No trials within ${locationFilter.radius} ${locationFilter.unit === 'km' ? 'km' : 'mi'} of ${locationFilter.formattedAddress}. Try a larger radius or clearing the location.`
                            : 'Try adjusting your search keywords.'}
                    </p>
                </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[550px] content-start">
                {paginatedData.map((trial) => (
                    <div
                        key={trial.id}
                        onClick={() => openModal(trial)}
                        className="relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100
                            hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5
                            transition-all duration-200 cursor-pointer overflow-hidden"
                    >
                        {/* Top accent bar — colored by eligibility match when available */}
                        <div className={`h-1.5 w-full shrink-0 ${getMatchStyle(trial.match).bar}`} />

                        <div className="flex flex-col flex-1 p-5 gap-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
                                    {trial.title}
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {trial.match && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getMatchStyle(trial.match).badge}`}>
                                            {getMatchStyle(trial.match).text}
                                        </span>
                                    )}
                                    {trial.completion_date && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                                            Ends {formatDate(trial.completion_date)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Snippet */}
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                                {cleanEligibilitySummary((trial?.eligibility_criteria_summary || trial?.summary)?.slice(0, 140))}
                                {(trial?.eligibility_criteria_summary || trial?.summary)?.length > 140 ? '…' : ''}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium tracking-wide ${getStatusColor(trial.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(trial.status)}`} />
                                    {convertStatus(trial.status)}
                                </span>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ViewDetailsButtons onClick={() => openModal(trial)} Text="View Details" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 gap-2">
                <button
                    type="button"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl
                        bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-semibold
                        hover:bg-sky-500 hover:border-sky-500 hover:text-white hover:shadow-md
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-50 disabled:hover:text-sky-700 disabled:hover:border-sky-200 disabled:hover:shadow-none
                        transition-all duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">
                    {paginatedData.length === 0 ? (
                        <span>No results</span>
                    ) : (
                        <>
                            <span>Page</span>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        let pageNum = parseInt(pageInput, 10);
                                        if (isNaN(pageNum) || pageNum < 1) {
                                            pageNum = 1;
                                            setPageInput('1');
                                        } else if (pageNum > totalPages) {
                                            pageNum = totalPages;
                                            setPageInput(totalPages.toString());
                                        }
                                        setCurrentPage(pageNum);
                                    }
                                }}
                                onBlur={() => {
                                    let pageNum = parseInt(pageInput, 10);
                                    if (isNaN(pageNum) || pageNum < 1) {
                                        pageNum = 1;
                                        setPageInput('1');
                                    } else if (pageNum > totalPages) {
                                        pageNum = totalPages;
                                        setPageInput(totalPages.toString());
                                    }
                                    setCurrentPage(pageNum);
                                }}
                                className="w-12 sm:w-16 px-1 py-1 text-center border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none"
                            />
                            <span>of {totalPages}</span>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl
                        bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-semibold
                        hover:bg-sky-500 hover:border-sky-500 hover:text-white hover:shadow-md
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-50 disabled:hover:text-sky-700 disabled:hover:border-sky-200 disabled:hover:shadow-none
                        transition-all duration-200"
                >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Modal */}
            {modalData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Accent bar — colored by eligibility match when available */}
                        <div className={`h-2 w-full shrink-0 ${getMatchStyle(modalData.match).bar}`} />

                        {/* Scrollable body */}
                        <div className="overflow-y-auto p-6 space-y-5">
                            {/* Title */}
                            <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                                {modalData.title}
                            </h2>

                            {/* Eligibility match panel — only shown after a search */}
                            {modalData.match && (() => {
                                const style = getMatchStyle(modalData.match);
                                const { met_inclusion, failed_inclusion, triggered_exclusion, missing_information } = modalData.match.reasons;
                                return (
                                    <div className={`rounded-xl border p-4 space-y-3 ${style.badge}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold">Eligibility Match</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.badge}`}>{style.text}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-xs text-gray-900">
                                            {met_inclusion.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-black-700 mb-1">Criteria met</p>
                                                    <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                        {met_inclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {failed_inclusion.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-black-700 mb-1">Criteria not met</p>
                                                    <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                        {failed_inclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {triggered_exclusion.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-red-700 mb-1">Exclusion criteria triggered</p>
                                                    <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                        {triggered_exclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {missing_information.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-gray-600 mb-1">Missing information</p>
                                                    <ul className="list-disc pl-4 space-y-0.5 text-black-600">
                                                        {missing_information.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Overview grid — uses displayData */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit ${getStatusColor(displayData?.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(displayData?.status)}`} />
                                        {convertStatus(displayData?.status)}
                                    </span>
                                </div>
                                {displayData?.sex && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sex</span>
                                        <span className="text-sm text-gray-800 font-medium">{displayData.sex}</span>
                                    </div>
                                )}
                                {displayData?.minimum_age && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Minimum Age</span>
                                        <span className="text-sm text-gray-800 font-medium">{displayData.minimum_age}</span>
                                    </div>
                                )}
                                {displayData?.start_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{displayData.start_date}</span>
                                    </div>
                                )}
                                {displayData?.primary_completion_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Primary Completion Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{displayData.primary_completion_date}</span>
                                    </div>
                                )}
                                {displayData?.completion_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completion Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{displayData.completion_date}</span>
                                    </div>
                                )}
                            </div>

                            {/* Conditions — available from list columns */}
                            {displayData?.conditions?.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">Conditions</span>
                                    <div className="flex flex-wrap gap-2">
                                        {displayData.conditions.map((condition, idx) => (
                                            <span key={idx} className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-xs font-medium">{condition}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Study Description — heavy field, show skeleton until fullModalData arrives */}
                            {(modalDetailLoading || displayData?.study_description || displayData?.summary) ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-500">Study Description</span>
                                    {modalDetailLoading ? (
                                        <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                                    ) : (
                                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                            {displayData.study_description || displayData.summary}
                                        </p>
                                    )}
                                </div>
                            ) : null}

                            {/* Eligibility Criteria Summary — only render when loading or data present */}
                            {(modalDetailLoading || displayData?.eligibility_criteria_summary) && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">Eligibility Criteria Summary</span>
                                    {modalDetailLoading ? (
                                        <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                                    ) : (
                                        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-3">
                                            {displayData.eligibility_criteria_summary
                                                .split('##')
                                                .filter(Boolean)
                                                .map((section, index) => {
                                                    const [title, ...lines] = section.trim().split('\n');
                                                    return (
                                                        <div key={index}>
                                                            <h4 className="font-semibold text-gray-900 mb-1">{title.replace(/-/g, '').trim()}</h4>
                                                            <ul className="list-disc pl-5 space-y-1">
                                                                {lines.filter(line => line.trim().startsWith('-')).map((line, lineIdx) => (
                                                                    <li key={lineIdx}>{line.replace('-', '').trim()}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Eligibility Criteria (structured) — only render when loading or data present */}
                            {(modalDetailLoading || displayData?.eligibility_summary_clinician_json) && (
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm font-medium text-gray-500">Eligibility Criteria</span>
                                    {modalDetailLoading ? (
                                        <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                                    ) : displayData?.eligibility_summary_clinician_json ? (
                                    <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-4 text-sm text-gray-700">
                                        {displayData.eligibility_summary_clinician_json.inclusion_criteria?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-green-700 mb-1">Inclusion Criteria</h4>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {displayData.eligibility_summary_clinician_json.inclusion_criteria.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {displayData.eligibility_summary_clinician_json.exclusion_criteria?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-red-700 mb-1">Exclusion Criteria</h4>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {displayData.eligibility_summary_clinician_json.exclusion_criteria.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                                </div>
                            )}

                            {/* Locations — only render when loading or data present */}
                            {(modalDetailLoading || displayData?.locations?.length > 0) && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                        {displayData?.locations?.length > 0
                                            ? <>Locations <span className="text-gray-400 font-normal">({displayData.locations.length})</span></>
                                            : 'Locations'}
                                    </span>
                                    {modalDetailLoading ? (
                                        <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                                    ) : (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                                            {displayData.locations.map((loc, locIdx) => (
                                                <div
                                                    key={locIdx}
                                                    onClick={() => setSelectedLocation(loc)}
                                                    className={`flex items-start justify-between gap-3 rounded-xl p-3 cursor-pointer transition-colors ${
                                                        selectedLocation === loc ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white border border-gray-100 shadow-sm hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                        <span className="text-sm font-semibold text-gray-800 truncate">{loc.facility}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                                                            {loc.zip ? ` ${loc.zip}` : ''}
                                                        </span>
                                                    </div>
                                                    {loc.status && (
                                                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${
                                                            loc.status.toUpperCase() === 'RECRUITING' ? 'bg-green-100 text-green-700'
                                                            : loc.status.toUpperCase() === 'COMPLETED' ? 'bg-gray-100 text-gray-600'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {loc.status.charAt(0).toUpperCase() + loc.status.slice(1).toLowerCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Google Maps embed for selected location */}
                                        {selectedLocation && (() => {
                                            const query = [selectedLocation.facility, selectedLocation.city, selectedLocation.state, selectedLocation.country, selectedLocation.zip]
                                                .filter(Boolean).join('+').replace(/\s+/g, '+');
                                            return (
                                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                                    <iframe
                                                        width="100%" height="220"
                                                        style={{ border: 0, display: 'block' }}
                                                        loading="lazy" allowFullScreen
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_API_KEY}&q=${encodeURIComponent(query)}`}
                                                    />
                                                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                                                        {selectedLocation.facility} — {[selectedLocation.city, selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ')}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                                </div>
                            )}
                        </div>

                        {/* Sticky footer */}
                        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                onClick={closeModal}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TrialCards;
