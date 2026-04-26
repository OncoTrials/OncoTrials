import React, { useState } from 'react'
import PatientNavBar from '../../components/layout/PatientNavBar'
import PhysicianNavbar from '../../components/layout/PhysicianNavbar'
import { useQuery } from '@tanstack/react-query'
import supabase from '../../utils/SupabaseClient'
import AddPatientForm from './AddPatientForm'
import TrialsTable from './TrialsTable'
import SearchTrialsForm from '../patient/SearchTrialsForm'
import TrialCards from '../patient/TrialCards'

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
            <div>
                <PhysicianNavbar user_email={response?.email} />
                <div className="flex gap-4 pr-3 pl-3 mt-5 min-h-[650px]">
                    <div className="sw-96 border shadow-2xl border-gray-300 rounded-2xl p-4">
                        <SearchTrialsForm trials={trials} onFilter={setFilteredTrials}/>
                    </div>
                    <div className="flex-1 shadow-2xl border overflow-auto border-gray-300 rounded-lg">
                        <TrialCards trials={filteredTrials?.length > 0 ? filteredTrials : []}/>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PhysicianDashboard