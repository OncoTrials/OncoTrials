import React, { useState } from 'react'
import CRCNavbar from '../../components/layout/CRCNavbar'
import { useQuery } from '@tanstack/react-query'
import supabase from '../../utils/SupabaseClient'
import FormButton from '../../components/buttons/FormButton'
import AddPatientForm from '../../components/forms/AddPatientForm'

const getUserMetadata = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  return user?.user_metadata || null;
}

const getPatients = async () => {
  const { data, error } = await supabase.from('patients').select('*');

  if (error) throw error;

  return data;
}



function CRCPatients() {
  const [activeTab, setActiveTab] = useState('matched');
  const [isModalOpen, setIsModalOpen] = useState(false);


  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: patients } = useQuery({
    queryKey: ['getPatients'],
    queryFn: getPatients,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  console.log(patients);

  const TabButton = ({ tab, isActive, onClick }) => {
    return (
      <button
        className={`
          relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out cursor-pointer
          ${isActive
            ? 'bg-blue-600 text-white shadow-lg transform scale-105'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }
        `}
        onClick={onClick}
      >
        {tab.label}
      </button>
    );
  }

  const enrolledPatients = (data) => (
    <>
      {data & data?.length > 0 ? (
        <div className='overflow-hidden bg-white'>
          <table>
            <tr>
              <th className="w-72 p-3 text-md font-semibold tracking-wide text-left">Title</th>
              <th className="w-48 p-3 text-md font-semibold tracking-wide text-left">Status</th>
              <th className="p-3 text-md font-semibold tracking-wide text-left">I/E Criteria</th>
              <th className="w-48 p-3 text-md font-semibold tracking-wide text-left">Cancer Type</th>
              <th className="p-3 text-md font-semibold tracking-wide text-left">Actions</th>
            </tr>
          </table>
        </div>
      ) :
        (
          <div className="flex items-center justify-center min-h-[300px] bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-md">No enrolled patients found.</p>
          </div>
        )}
    </>
  )

  const matchedPatients = (data) => (
    <>
      {data && data?.length > 0 ? (
        <table className='w-full'>
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">Patient</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">Cancer Type</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">BioMarkers</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left"># of Matched Trials</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">Best Match</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">Referred By</th>
              <th className="w-24 p-3 text-md font-semibold tracking-wide text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((patient) => (
              <tr key={patient.id} className='hover:bg-gray-100 transition odd:bg-gray-50'>
                <td className="p-3">{patient.full_name}</td>
                <td className="p-3">{patient.diagnosis}</td>
                <td className="p-3">{patient.biomarkers}</td>
                {/* will add other cells */}
              </tr>
            ))}
          </tbody>
        </table>
      ) :
        (
          <div className="flex items-center justify-center min-h-[300px] bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-md">No trials found. Please adjust your search criteria.</p>
          </div>
        )}
    </>
  )

  const renderTabContent = (data) => {
    switch (activeTab) {
      case 'matched':
        return matchedPatients(data);
      case 'enrolled':
        return enrolledPatients(data);
      default:
        return matchedPatients(data);
    }
  }

  const tabs = [
    {
      id: 'matched',
      label: 'Matched Patients',
    },
    {
      id: 'enrolled',
      label: 'Enrolled Patients',
    },
  ]
  return (
    <div>
      <CRCNavbar user_email={response?.email} />

      <div className='flex flex-col items-center justify-center'>
        <div className='flex flex-row items-center justify-center h-48 gap-20'>
          <div className='flex flex-col gap-5 items-center justify-center border w-64 h-24 rounded-2xl shadow-2xs'>
            <p className='text-2xl font-bold'>Total Patients:</p>
            <p className='text-xl'>{patients?.length}</p>
          </div>
          <div className='flex flex-col gap-5 items-center justify-center border w-64 h-24 rounded-2xl shadow-2xs'>
            <p className='text-2xl font-bold'>Enrolled Patients:</p>
            <p className='text-xl'>{patients?.length}</p>
          </div>
          <div className='flex flex-col gap-5 items-center justify-center border w-64 h-24 rounded-2xl shadow-2xs'>
            <p className='text-2xl font-bold'>Matched Patients:</p>
            <p className='text-xl'>{patients?.length}</p>
          </div>
        </div>
        <div className='mb-10'>
          <FormButton text={'Add a Patient'} onClick={() => setIsModalOpen(true)}/>
          <AddPatientForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </div>

      <div className='flex flex-col items-center  h-dvh space-y-5'>
        {/* Tab Navigation */}
        <div className='flex flex-row space-x-2 bg-gray-100 p-1 rounded-xl shadow-inner'>
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className='w-full max-w-5xl p-6 bg-white rounded-lg shadow-xl border border-gray-200'>
          {renderTabContent(patients)}
        </div>
      </div>
    </div>
  )
}

export default CRCPatients