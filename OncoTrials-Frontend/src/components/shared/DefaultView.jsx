import React from 'react';
import { SkeletonCards } from './TrialCardsSkeleton';

// Shown when `trials === null` — i.e. no search has been run yet. Also
// covers the "Browse All" loading/error sub-states, since they're all part
// of the same "nothing to show yet" phase.
function DefaultView({ browseAllPending, trialsError, retrying, handleRetry, onShowAll }) {
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
                    {Array.from({ length: 12 }).map((_, i) => <SkeletonCards key={i} />)}
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

export default DefaultView;