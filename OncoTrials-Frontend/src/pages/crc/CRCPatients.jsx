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

// const getEnrolledPatients = async () => {
//   const { data, error } = await supabase.from('patients').select('*');
//   if (error) throw error;
//   return data;
// }

const StatCard = ({ label, value }) => (
  <div className='flex flex-row items-center justify-center h-48 gap-20'>
    <div className='flex flex-col gap-5 items-center justify-center border w-64 h-24 rounded-2xl shadow-2xs'>
      <p className='text-2xl font-bold'>{label}:</p>
      <p className='text-xl'>{value ?? '-'}</p>
    </div>
  </div>
)

function CRCPatients() {
  const [activeTab, setActiveTab] = useState('matched');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: response } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000,
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

  const tabs = [
    { id: 'matched', label: 'Matched Patients' },
    { id: 'enrolled', label: 'Enrolled Patients' },
  ];

  const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );

  const MatchedTable = ({ data }) => {
    if (!data || data.length === 0) return <EmptyState message="No matched patients found." />;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Patient', 'Cancer Type', 'Biomarkers', 'Matched Trials', 'Best Match', 'Referred By', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((patient, i) => (
            <tr key={patient.id} className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {patient.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-medium text-gray-800">{patient.full_name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{patient.diagnosis ?? '—'}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{patient.biomarkers ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{patient.num_of_matches ?? '-'}</td>
              <td className="px-4 py-3 text-gray-500">-</td>
              <td className="px-4 py-3 text-gray-500">{patient.referred_by.email}</td>
              <td className="px-4 py-3">
                <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline transition-colors">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const EnrolledTable = ({ data }) => {
    if (!data || data.length === 0) return <EmptyState message="No enrolled patients found." />;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Title', 'Status', 'I/E Criteria', 'Cancer Type', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((patient, i) => (
            <tr key={patient.id} className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
              <td className="px-4 py-3 font-medium text-gray-800">
                <div className='flex items-center gap-2.5'>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {patient.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <span>{patient.full_name}</span>
                </div>

              </td>
              <td className="px-4 py-3">—</td>
              <td className="px-4 py-3 text-gray-500">—</td>
              <td className="px-4 py-3">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{patient.diagnosis ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline transition-colors">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CRCNavbar user_email={response?.email} />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Patients</h1>
            <p className="text-sm text-gray-400 mt-1">Manage and track your clinical trial patients</p>
          </div>
          <div>
            <FormButton text="+ Add Patient" onClick={() => setIsModalOpen(true)} />
            <AddPatientForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="flex items-center justify-center gap-4">
          <StatCard label="Total Patients" value={patients?.length} icon="👥" />
          <StatCard label="Enrolled" value={patients?.length} icon="✅" />
          <StatCard label="Matched" value={patients?.length} icon="🔗" />
        </div>

        {/* Tab Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 cursor-pointer ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {activeTab === 'matched' ? <MatchedTable data={patients} /> : <EnrolledTable data={patients} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CRCPatients;