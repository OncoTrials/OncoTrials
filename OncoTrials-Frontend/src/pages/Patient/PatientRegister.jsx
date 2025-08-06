import React from 'react'
import HomeNavBar from '../../components/HomeNavBar'
import PatientRegisterForm from '../../components/PatientRegisterForm'

function PatientRegister() {
  return (
    <>
      <div className='animate-fade-down bg-gradient-to-br from-blue-100 via-white to-indigo-100'>
        <HomeNavBar />
        <PatientRegisterForm/>
      </div>
    </>
  )
}

export default PatientRegister