import React from 'react'
import PhysicianCRCLoginForm from '../../components/forms/PhysicianCRCLoginForm'
import HomeNavBar from '../../components/layout/HomeNavBar'

function PhysicianCRCLoginPage() {
  return (
    <>
      <div className=' bg-gradient-to-br from-blue-100 via-white to-indigo-100 animate-fade-down'>
        <HomeNavBar />
        <PhysicianCRCLoginForm />
      </div>
    </>
  )
}

export default PhysicianCRCLoginPage