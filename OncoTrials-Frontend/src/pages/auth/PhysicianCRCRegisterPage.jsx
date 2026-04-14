import React from 'react'
import PhysicianCRCRegisterForm from '../../components/forms/PhysicianCRCRegisterForm'
import HomeNavBar from '../../components/layout/HomeNavBar'

function PhysicianCRCRegisterPage() {
  return (
    <div className='bg-gradient-to-br from-blue-100 via-white to-indigo-100'>
      <HomeNavBar />
      <PhysicianCRCRegisterForm/>
    </div>
  )
}

export default PhysicianCRCRegisterPage