import React, { useState, useEffect } from 'react';
import { getTrialById } from '../../api/trialsApi';
import { getOrganizationName } from '../../api/organizationsApi';
import { useNavigate } from 'react-router';
import { useProcessedTrials } from '../../hooks/useProcessedTrials';
import DefaultView from './DefaultView';
import NoResultsState from './NoResults';
import TrialResultsView, { FILTERS_ENABLED } from './TrialResultsView';

// `viewResetKey` is a number supplied by the parent. It changes every time the
// user starts a new view of the results (runs a sidebar search, resets the
// form, or clicks "Browse All"). When it changes we clear the in-card keyword
// search and jump back to the first page so each new view starts clean.
function TrialCards({ trials, isLoading, trialsError = false, browseAllPending = false, onShowAll, onRetry, streamingTotal = 0, streamDone = false, viewResetKey = 0, userData }) {
    const [organizationName, setOrganizationName] = useState(null);
    const [editTrial, setEditTrial] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadOrganizationName() {
            if (!userData?.organization_id) return;
            try {
                const name = await getOrganizationName(userData.organization_id);
                setOrganizationName(name.name);
            } catch (err) {
                console.error(err);
            }
        }
        loadOrganizationName();
    }, [userData?.organization_id]);

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

    const processedTrials = useProcessedTrials(trials, { searchQuery, sortBy, locationFilter, filtersEnabled: FILTERS_ENABLED });

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
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

    const handleCommitPage = () => {
        let pageNum = parseInt(pageInput, 10);
        if (isNaN(pageNum) || pageNum < 1) {
            pageNum = 1;
            setPageInput('1');
        } else if (pageNum > totalPages) {
            pageNum = totalPages;
            setPageInput(totalPages.toString());
        }
        setCurrentPage(pageNum);
    };

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

    const openDetailsModal = (trial, event) => {
        event?.stopPropagation();
        setModalData(trial);
        setFullModalData(null);
        setSelectedLocation(null);
    };

    const openEditModal = (trial, event) => {
        event?.stopPropagation();
        setEditTrial(trial);
    };

    const closeModal = () => {
        setModalData(null);
        setFullModalData(null);
        setSelectedLocation(null);
    };

    // displayData merges full (when ready) over partial
    const displayData = fullModalData ?? modalData;

    // No search performed yet — show instructional prompt immediately (even while loading)
    if (trials === null) {
        return (
            <DefaultView
                browseAllPending={browseAllPending}
                trialsError={trialsError}
                retrying={retrying}
                handleRetry={handleRetry}
                onShowAll={onShowAll}
            />
        );
    }

    // Search returned no matches
    if (trials.length === 0) {
        return <NoResultsState streamDone={streamDone} />;
    }

    // Results
    return (
        <TrialResultsView
            processedTrials={processedTrials}
            paginatedData={paginatedData}
            streamDone={streamDone}
            streamingTotal={streamingTotal}
            organizationName={organizationName}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showSortDropdown={showSortDropdown}
            setShowSortDropdown={setShowSortDropdown}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            viewResetKey={viewResetKey}
            currentPage={currentPage}
            totalPages={totalPages}
            pageInput={pageInput}
            setPageInput={setPageInput}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onCommitPage={handleCommitPage}
            modalData={modalData}
            displayData={displayData}
            modalDetailLoading={modalDetailLoading}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            openDetailsModal={openDetailsModal}
            openEditModal={openEditModal}
            closeModal={closeModal}
            editTrial={editTrial}
            setEditTrial={setEditTrial}
            onRetry={onRetry}
        />
    );
}

export default TrialCards;