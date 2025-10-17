import React from 'react'
import { useQuery } from '@tanstack/react-query'
import CRCNavbar from '../../components/layout/CRCNavbar'
import supabase from '../../utils/SupabaseClient'

const getUserMetadata = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    return user?.user_metadata || null;
}

function CRCDashboard() {

    const { data: response, isLoading, isError } = useQuery({
        queryKey: ['getUserMetadata'],
        queryFn: getUserMetadata,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });


    return (
        <div>
            <CRCNavbar user_email={response?.email}/>
            CRCDashboard
        </div>
    )
}

export default CRCDashboard