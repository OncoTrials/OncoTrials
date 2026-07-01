import React from 'react';
import { SkeletonCards } from './TrialCardsSkeleton';

// Shown when `trials.length === 0` — either still streaming in (show
// skeletons) or the search is fully done and genuinely found nothing.
function NoResultsState({ streamDone }) {
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
                    {Array.from({ length: 12 }).map((_, i) => <SkeletonCards key={i} />)}
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

export default NoResultsState;