import { useQuery } from '@tanstack/react-query'
import CRCNavbar from '../../components/layout/CRCNavbar'
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

function CRCTrials() {

  // NOTE for Jeremiah: isLoading, isError are unused
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  // NOTE for Jeremiah: is this being used?
  const { data: trials } = useQuery({
    queryKey: ['getAllTrials'],
    queryFn: getAllTrials,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });




// NOTE for Jeremiah: should we remove the below hardcoded lines?
  return (
    <>
      <div>
        <CRCNavbar user_email={response?.email} />
        {/* <div className='p-5'>
          <TrialDashboard trials={trials} trialsPerPage={8}/>
        </div> */}
      </div>
    </>
  )
}

export default CRCTrials