import React from 'react'
import PhysicianCRCRegisterForm from '../components/PhysicianCRCRegisterForm'
import HomeNavBar from '../components/HomeNavBar'

function PhysicianCRCRegisterPage() {
  return (
    <div className='bg-gradient-to-br from-blue-100 via-white to-indigo-100'>
      <HomeNavBar />
      <PhysicianCRCRegisterForm/>
    </div>
  )
}

export default PhysicianCRCRegisterPage