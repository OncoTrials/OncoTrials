import { useQuery } from '@tanstack/react-query'
import CRCNavbar from '../../components/layout/CRCNavbar'
import supabase from '../../utils/SupabaseClient'
import TrialDashboard from './TrialDashboard'

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

const getAllRecruitingTrials = async () => {
    const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('status', 'RECRUITING');
    

    if (error) throw error;
    return data;
}

function CRCDashboard() {


    // NOTE for Jeremiah: isLoading, isError are unused
    const { data: response, isLoading, isError } = useQuery({
        queryKey: ['getUserMetadata'],
        queryFn: getUserMetadata,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });



    const { data: trials } = useQuery({
        queryKey: ['getAllTrials'],
        queryFn: getAllTrials,
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const { data: recruitingTrials } = useQuery({
        queryKey: ['getAllRecruitingTrials'],
        queryFn: getAllRecruitingTrials,
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });

    console.log(recruitingTrials.length);






    return (
        <div>
            <CRCNavbar user_email={response?.email} />
            <div className='flex items-center justify-center h-52'>
                <div className='flex flex-row gap-10'>
                    <div className='flex flex-col gap-1.5 items-center justify-center w-72 h-36 shadow-lg'>
                        <h3 className='font-bold text-2xl'>{trials?.length}+</h3>
                        <p>Total Trials Available</p>
                    </div>
                    <div className='flex flex-col gap-1.5 items-center justify-center w-72 h-36 shadow-lg'>
                        <h3 className='font-bold text-2xl'>{recruitingTrials.length}+</h3>
                        <p>Trials Recruiting</p>
                    </div>
                    <div className='flex flex-col gap-1.5 items-center justify-center w-72 h-36 shadow-lg'>
                        <h3 className='font-bold text-2xl'>TBD</h3>
                        <p>Enrolled Patients</p>
                    </div>
                </div>
            </div>
            <div className='flex items-center justify-center'>
                <TrialDashboard trials={trials} trialsPerPage={5}/>
            </div>
        </div>
    )
}

export default CRCDashboard