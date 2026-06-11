import React, { useState, useEffect } from 'react'
import PhysicianNavbar from '../../components/layout/PhysicianNavbar'
import { useQuery } from '@tanstack/react-query'
import supabase from '../../utils/SupabaseClient'
import SearchTrialsForm from '../Patient/SearchTrialsForm'
import TrialCards from '../Patient/TrialCards'
import PageFooter from '../../components/layout/PageFooter.jsx'
import { getAllTrials } from '../../api/trialsApi'

const getUserMetadata = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata || null;
}

function PhysicianDashboard() {
    const [showFilters, setShowFilters] = useState(true);

    const { data: userData, isLoading, isError } = useQuery({
        queryKey: ['getUserMetadata'],
        queryFn: getUserMetadata,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });

    const { data: trials, isLoading: trialsLoading, isError: trialsError, refetch: refetchTrials } = useQuery({
        queryKey: ['getAllTrials'],
        queryFn: getAllTrials,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
    });

    console.log(trials);


    // null = no search performed yet; [] = search returned no results; [...] = results
    const [filteredTrials, setFilteredTrials] = useState(null);
    const [browseAllPending, setBrowseAllPending] = useState(false);

    useEffect(() => {
        if (!trialsLoading && browseAllPending) {
            if (trialsError) {
                // Keep browseAllPending=true to let TrialCards display the error state
            } else {
                setBrowseAllPending(false);
                setFilteredTrials(trials || null);
            }
        }
    }, [trialsLoading, browseAllPending, trialsError, trials]);

    const handleShowAll = () => {
        if (trialsLoading || trialsError) { setBrowseAllPending(true); return; }
        setFilteredTrials(trials || null);
    };

    return (
        <>
        <PhysicianNavbar user_email={userData?.email} />
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
            <SearchTrialsForm trials={trials} onFilter={setFilteredTrials} isLoading={trialsLoading} />
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
            />
          </div>
        </div>
        <PageFooter/>
      </>
    )
}

export default PhysicianDashboard