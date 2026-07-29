import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../utils/SupabaseClient'
import { useQuery } from '@tanstack/react-query'
import TrialCards from '../../components/shared/TrialCards'
import SearchTrialsForm from './SearchTrialsForm'
import HomeNavBar from '../../components/layout/HomeNavBar'
import PageFooter from '../../components/layout/PageFooter'
import { getAllTrials, streamAllTrials } from '../../api/trialsApi'

const getUserMetadata = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata || null;
}

function PatientDashboard() {
  const [showFilters, setShowFilters] = useState(true);


  // Streaming trials state
  const [trials, setTrials] = useState(null);   // null = not yet loaded
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [trialsError, setTrialsError] = useState(false);
  // How many trials the backend says exist in total (sent with every chunk).
  // Used to show a "loading more…" hint while the rest stream in.
  const [trialsTotal, setTrialsTotal] = useState(0);
  // True once the final chunk has arrived, i.e. the whole list is loaded.
  const [trialsStreamDone, setTrialsStreamDone] = useState(false);
  // Changing this number forces the stream effect below to run again. We bump
  // it from the "Try Again" button so a failed load can be retried without
  // remounting the whole page.
  const [streamReloadKey, setStreamReloadKey] = useState(0);

  // Load the full trial list by *streaming* it from the backend.
  //
  // Instead of waiting for one giant response, the backend sends the trials in
  // batches (chunks). Each batch is appended to `trials` as soon as it arrives,
  // so the user sees the first cards almost immediately and the rest fill in.
  //
  // Why the AbortController: React's StrictMode mounts, unmounts, then remounts
  // a component during development to surface cleanup bugs. We must therefore
  // cancel the in-flight network request when this effect is cleaned up, and
  // start a brand-new one on the remount. (An earlier version used a flag that
  // was never reset, so the single stream it started got cancelled and dropped
  // every batch — leaving the page stuck on loading skeletons forever.)
  useEffect(() => {
    // Lets us cancel the in-flight fetch when this effect is torn down.
    const streamAbortController = new AbortController();
    // Set to true by the cleanup function; tells late-arriving batches to stop
    // updating state for an effect run that no longer exists.
    let hasEffectBeenCleanedUp = false;
    // Collects every batch received so far, so we can build the running list.
    const accumulatedTrials = [];

    setTrialsLoading(true);
    setTrialsError(false);
    setTrialsStreamDone(false);

    streamAllTrials((trialsBatch, { total: totalTrialCount, done: isFinalBatch }) => {
      // Ignore anything that arrives after cleanup (e.g. the StrictMode unmount).
      if (hasEffectBeenCleanedUp) return;

      accumulatedTrials.push(...trialsBatch);
      // Hand React a fresh array so it re-renders with the trials gathered so far.
      setTrials([...accumulatedTrials]);
      setTrialsTotal(totalTrialCount);

      if (isFinalBatch) {
        setTrialsStreamDone(true);
        setTrialsLoading(false);
      }
    }, streamAbortController.signal).catch((streamError) => {
      // A cancelled request (StrictMode cleanup / leaving the page) is expected,
      // not a real failure — so don't show an error or fall back for those.
      if (hasEffectBeenCleanedUp || streamError?.name === 'AbortError') return;

      console.error('[PatientDashboard] streaming failed, falling back to a single bulk request:', streamError);
      // Fallback: ask for the whole list in one (non-streamed) response instead.
      getAllTrials()
        .then((allTrials) => {
          if (hasEffectBeenCleanedUp) return;
          setTrials(allTrials);
          setTrialsTotal(allTrials.length);
          setTrialsStreamDone(true);
          setTrialsLoading(false);
        })
        .catch((bulkFetchError) => {
          if (hasEffectBeenCleanedUp) return;
          console.error('[PatientDashboard] bulk fallback request also failed:', bulkFetchError);
          setTrialsError(true);
          setTrialsLoading(false);
        });
    });

    // Cleanup: mark this run as gone and cancel its network request.
    return () => {
      hasEffectBeenCleanedUp = true;
      streamAbortController.abort();
    };
  }, [streamReloadKey]);

  // Called by the "Try Again" button after a load failure. Clears the previous
  // results and bumps the reload key, which re-runs the stream effect above.
  const refetchTrials = useCallback(() => {
    setTrials(null);
    setTrialsError(false);
    setTrialsStreamDone(false);
    setTrialsTotal(0);
    setStreamReloadKey((previousKey) => previousKey + 1);
  }, []);

  // The list of trials currently shown in the results area. Three meanings:
  //   null  → the user hasn't searched or browsed yet (show the intro screen)
  //   []    → a search ran but matched nothing (show "no results")
  //   [...] → trials to display
  const [filteredTrials, setFilteredTrials] = useState(null);
  // True while the user has asked to "Browse All" but the full list is still
  // streaming in. Lets us keep `filteredTrials` in sync with the live stream.
  const [browseAllPending, setBrowseAllPending] = useState(false);

  // A counter we increment on each *deliberate* user action that changes the
  // result set: running a sidebar search, resetting the form, or clicking
  // "Browse All". TrialCards watches this number and, whenever it changes,
  // clears its own keyword search box and jumps back to page 1.
  //
  // It is intentionally NOT bumped while trials stream in — otherwise the
  // search box would be wiped on every batch as the list loads.
  const [resultsViewResetKey, setResultsViewResetKey] = useState(0);

  // Handler given to the sidebar form. The form calls this with the matched
  // trials after a search, or with null after a reset. Either way we also bump
  // the reset key so the results view (search box + page number) starts fresh.
  const handleSidebarFilter = useCallback((matchedTrials) => {
    setFilteredTrials(matchedTrials);
    setResultsViewResetKey((previousKey) => previousKey + 1);
  }, []);

  // Keeps the displayed list in sync with the streaming load while "Browse All"
  // is active: as each batch of trials arrives, mirror it into filteredTrials.
  useEffect(() => {
    if (!browseAllPending) return;

    if (!trialsError) {
      // Show whatever has streamed in so far (or [] if nothing yet).
      setFilteredTrials(trials || []);
    }
    // Once the stream has fully finished, we no longer need to keep mirroring.
    if (!trialsLoading) {
      setBrowseAllPending(false);
    }
  }, [trialsLoading, browseAllPending, trialsError, trials]);

  // Called by the "Browse All Trials" button: show the full list and reset the
  // results view (search box + pagination) so the user starts at a clean page 1.
  const handleShowAll = () => {
    setBrowseAllPending(true);
    setResultsViewResetKey((previousKey) => previousKey + 1);
  };

  return (
    <>
      <HomeNavBar />
      <div className="flex flex-col lg:flex-row gap-4 px-3 mt-5 min-h-[650px]">
        {/* Mobile / desktop toggle */}
        <div className="w-full lg:hidden">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-left font-semibold shadow"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {/* Search Form */}
        <div
          className={`
      w-full lg:w-96 border border-gray-300 shadow-2xl rounded-2xl p-4
      ${showFilters ? "block" : "hidden"}
      lg:block
    `}
        >
          <SearchTrialsForm trials={trials} onFilter={handleSidebarFilter} isLoading={trialsLoading} />
        </div>

        {/* Results */}
        <div className="w-full flex-1 shadow-2xl border border-gray-300 rounded-lg overflow-auto">
          <TrialCards
            trials={filteredTrials}
            isLoading={trialsLoading}
            trialsError={trialsError}
            browseAllPending={browseAllPending}
            onShowAll={handleShowAll}
            onRetry={refetchTrials}
            streamingTotal={trialsTotal}
            streamDone={trialsStreamDone}
            viewResetKey={resultsViewResetKey}
          />
        </div>
      </div>
      <PageFooter/>
    </>
  );
}

export default PatientDashboard;