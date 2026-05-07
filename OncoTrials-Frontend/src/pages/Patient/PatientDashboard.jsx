import React, { useEffect, useState } from 'react'
import PatientNavBar from '../../components/layout/PatientNavBar'
import { useNavigate } from 'react-router-dom'
import supabase from '../../utils/SupabaseClient'
import { useQuery } from '@tanstack/react-query'
import TrialCards from './TrialCards'
import SearchTrialsForm from './SearchTrialsForm'
import HomeNavBar from '../../components/layout/HomeNavBar'
import PageFooter from '../../components/layout/PageFooter'


const getUserMetadata = async () => {
  const { data: { user } } = await supabase.auth.getUser();


  return user?.user_metadata || null;
}

const getAllTrials = async () => {
  const { data, error } = await supabase
    .from('trials')
    .select('*');

  if (error) throw error;
  return data;
}



function PatientDashboard() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(true);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: trials, isLoading: trialsLoading } = useQuery({
    queryKey: ['getAllTrials'],
    queryFn: getAllTrials,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [filteredTrials, setFilteredTrials] = useState([]);
  const displayedTrials = filteredTrials ?? trials;

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
          <SearchTrialsForm trials={trials} onFilter={setFilteredTrials} />
        </div>

        {/* Results */}
        <div className="w-full flex-1 shadow-2xl border border-gray-300 rounded-lg overflow-auto">
          <TrialCards trials={displayedTrials} />
        </div>
      </div>
      <PageFooter/>
    </>

  );
}

export default PatientDashboard;