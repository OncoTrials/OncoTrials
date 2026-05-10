import { useQuery } from '@tanstack/react-query'
import CRCNavbar from '../../components/layout/CRCNavbar'
import TrialDashboard from './TrialDashboard'
import supabase from '../../utils/SupabaseClient'

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

function CRCMatchingHub() {

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





  return (
    <>
      <div>
        <CRCNavbar user_email={response?.email} />
        <div className='p-5'>
          <TrialDashboard trials={trials} trialsPerPage={8}/>
        </div>
      </div>
    </>
  )
}

export default CRCMatchingHub