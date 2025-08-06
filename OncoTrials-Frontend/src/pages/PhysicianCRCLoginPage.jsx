import React from 'react'
import PhysicianCRCLoginForm from '../components/PhysicianCRCLoginForm'
import HomeNavBar from '../components/HomeNavBar'

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