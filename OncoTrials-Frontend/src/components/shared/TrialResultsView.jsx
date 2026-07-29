import React from 'react';
import TrialCard from './TrialCard';
import TrialPagination from './TrialPagination';
import SearchSortToolbar from './SearchSortToolbar';
import TrialDetailsModal from './TrialDetailsModal';
import EditTrial from '../forms/EditTrial';

// Temporarily hide the in-toolbar filter controls (keyword search, location,
// sort) while keeping all of their state and logic intact in the parent.
// Flip to true to restore them. NOTE for when re-enabling: these should only
// act once the stream has finished (streamDone), otherwise they filter/sort
// against a partially-loaded list and the visible results keep changing as
// more batches arrive. See useProcessedTrials' `filtersEnabled` option.
export const FILTERS_ENABLED = true;

function TrialResultsView({
    processedTrials,
    paginatedData,
    streamDone,
    streamingTotal,
    organizationName,
    // search/sort/location
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showSortDropdown,
    setShowSortDropdown,
    locationFilter,
    setLocationFilter,
    viewResetKey,
    // pagination
    currentPage,
    totalPages,
    pageInput,
    setPageInput,
    onPreviousPage,
    onNextPage,
    onCommitPage,
    // modal / edit
    modalData,
    displayData,
    modalDetailLoading,
    selectedLocation,
    setSelectedLocation,
    openDetailsModal,
    openEditModal,
    closeModal,
    editTrial,
    setEditTrial,
    onRetry,
}) {
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
                    <SearchSortToolbar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        showSortDropdown={showSortDropdown}
                        setShowSortDropdown={setShowSortDropdown}
                        setLocationFilter={setLocationFilter}
                        viewResetKey={viewResetKey}
                    />
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
                        <TrialCard
                            key={trial.id}
                            trial={trial}
                            organizationName={organizationName}
                            onOpenDetails={openDetailsModal}
                            onOpenEdit={openEditModal}
                        />
                    ))}
                </div>
            )}

            <TrialPagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageInput={pageInput}
                setPageInput={setPageInput}
                paginatedLength={paginatedData.length}
                onPrevious={onPreviousPage}
                onNext={onNextPage}
                onCommitPage={onCommitPage}
            />

            <TrialDetailsModal
                modalData={modalData}
                displayData={displayData}
                modalDetailLoading={modalDetailLoading}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                closeModal={closeModal}
            />

            <EditTrial
                trial={editTrial}
                isOpen={!!editTrial}
                onClose={() => setEditTrial(null)}
                onSaveSuccess={onRetry}
            />
        </div>
    );
}

export default TrialResultsView;