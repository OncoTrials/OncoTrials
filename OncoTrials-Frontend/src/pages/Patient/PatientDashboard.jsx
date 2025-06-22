import React from 'react'
import PatientNavBar from '../../components/PatientNavBar'
import SearchTrialsForm from './SearchTrialsForm'
import AddPatientTable from './AddPatientTable'

function PatientDashboard() {
  
  return (
    <>
      <div className='flex flex-col min-h-screen animate-fade-down'>
        <PatientNavBar />
        <div className='relative flex top-5 left-5 text-4xl font-semibold'>
          <h1>Patient Dashboard</h1>
        </div>
        <div className='flex flex-row'>
          <div className='flex flex-col mt-10 ml-5 justify-start'>
            <div className='max-w-80 p-5 rounded-lg shadow-xl border border-gray-600'>
              <h2 className='text-3xl font-semibold'>Search Trials</h2>
              <SearchTrialsForm />
            </div>
          </div>
          {/* Trials table */}
          <div className='flex flex-col mt-10 ml-5 justify-start'>
            <div className='w-5xl p-5 rounded-lg shadow-xl border border-gray-600'>
              <h2 className='text-3xl font-semibold'>Trials Table</h2>
              <AddPatientTable/>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}

export default PatientDashboard