import React, { useEffect, useState } from 'react'
import PatientNavBar from '../../components/PatientNavBar'
import SearchTrialsForm from './SearchTrialsForm'
import AddPatientTable from './AddPatientTable'
import { useNavigate } from 'react-router-dom'
import supabase from '../../utils/SupabaseClient'
import { useQuery } from '@tanstack/react-query'

const getUserMetadata = async () => {
  const { data: { user } } = await supabase.auth.getUser();


  return user?.user_metadata || null;
}



function PatientDashboard() {
  const navigate = useNavigate();
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  console.log(response);

  return (
    <>
      <div className='flex flex-col min-h-screen animate-fade-down'>
        <PatientNavBar user_email={response?.email}/>
        <div className='relative flex top-5 left-5 text-4xl font-semibold'>
        </div>
        <div className='flex flex-row gap-20'>
          <div className='flex flex-col mt-10 ml-5 justify-start'>
            <div className=' w-80 h-5/6 p-5 rounded-lg shadow-xl border border-gray-600'>
              <h2 className='text-3xl font-semibold'>Search Trials</h2>
              <SearchTrialsForm />
            </div>
          </div>
          {/* Trials table */}
          <div className='flex flex-col mt-10 items-center justify-start'>
            <div className='w-full max-w-6xl p-5 rounded-2xl shadow-2xl border border-gray-600 overflow-x-auto'>
              <h2 className='text-3xl font-semibold'>Trials Table</h2>
              <AddPatientTable />
            </div>
          </div>

        </div>

      </div>
    </>
  )
}

export default PatientDashboard