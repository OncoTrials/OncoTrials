import { useState } from 'react'
import PhysicianNavbar from '../../components/layout/PhysicianNavbar'
import { useQuery } from '@tanstack/react-query'
import supabase from '../../utils/SupabaseClient'
import SearchTrialsForm from '../Patient/SearchTrialsForm'
import TrialCards from '../Patient/TrialCards'

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

function PhysicianDashboard() {
    const [showFilters, setShowFilters] = useState(true);

    // NOTE for Jeremiah: isLoading, isError aren't being used, delete?
    const { data: response, isLoading, isError } = useQuery({
        queryKey: ['getUserMetadata'],
        queryFn: getUserMetadata,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });

    const { data: trials = [] } = useQuery({
        queryKey: ['getAllTrials'],
        queryFn: getAllTrials,
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });


    const [filteredTrials, setFilteredTrials] = useState([]);


    return (
        <>
        <PhysicianNavbar user_email={response?.email} />
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
            <TrialCards trials={filteredTrials?.length > 0 ? filteredTrials : []} />
          </div>
        </div>
      </>
    )
}

export default PhysicianDashboard