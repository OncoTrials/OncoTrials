import React, { useState } from 'react'
import PatientNavBar from '../../components/PatientNavBar'
import { CameraIcon } from '@phosphor-icons/react';

function PatientSettings() {
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  // Fixed: Added return statement and proper JSX
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

  const profileSettings = () => (
    <div className='w-full p-5 rounded-lg shadow-xl border border-gray-600'>
      <div className='flex flex-col items-center justify-center space-y-3'>
        <div className='flex items-center justify-center'>
          <div className='rounded-full w-32 h-32 bg-blue-600'>
            <div className='flex items-center justify-center h-full w-full text-white text-6xl'>
              JM
            </div>
          </div>
        </div>
        <button className='text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-2'>
          <CameraIcon size={32} />
          <span>Change Profile Picture</span>
        </button>
      </div>

      <form className='mt-5 space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Name
          </label>
          <input
            type='text'
            name='name'
            value={formData.name}
            onChange={handleInputChange}
            placeholder='Input text'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Description
          </label>
          <textarea
            name='description' 
            value={formData.description}
            onChange={handleInputChange} 
            placeholder='Input text'
            rows={4}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
          />
        </div>
        <button className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors'>
          Save Changes
        </button>
      </form>
    </div>
  )

  const securitySettings = () => (
    <div className='w-full max-w-md space-y-6'>
      {/* Email Section */}
      <div>
        <h3 className='text-lg font-semibold mb-2'>Email</h3>
        <p className='text-sm text-gray-600 mb-3'>
          Update your email address. We'll send a verification link to confirm the change.
        </p>
        <div className='space-y-2'>
          <label className='block text-sm font-medium text-gray-700'>
            Email
          </label>
          <input
            type='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange} 
            placeholder='Input text'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors'>
            Update Email
          </button>
        </div>
      </div>

      {/* Divider */}
      <hr className='border-gray-300' />

      {/* Password Section */}
      <div>
        <h3 className='text-lg font-semibold mb-2'>Password</h3>
        <p className='text-sm text-gray-600 mb-3'>
          Password must be 8 Characters long
        </p>
        <div className='space-y-3'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Current Password
            </label>
            <input
              type='password'
              name='currentPassword' 
              value={formData.currentPassword}
              onChange={handleInputChange} 
              placeholder='Input text'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                New Password
              </label>
              <input
                type='password'
                name='newPassword' 
                value={formData.newPassword}
                onChange={handleInputChange} 
                placeholder='Input text'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

          <button className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors'>
            Update Password
          </button>
        </div>
      </div>
    </div>
  );

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
    },
    {
      id: 'security',
      label: 'Security',
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return profileSettings();
      case 'security':
        return securitySettings();
      default:
        return profileSettings();
    }
  }

  return (
    <>
      <div className='flex flex-col min-h-screen animate-fade-down'>
        <PatientNavBar />
        <div className='relative flex top-5 left-5 text-4xl font-semibold'>
          <h1>Profile Settings</h1>
        </div>

        <div className='flex flex-col items-center justify-center mt-6 h-dvh space-y-5'>
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
          <div className='w-full max-w-lg p-6 bg-white rounded-lg shadow-xl border border-gray-200'>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  )
}

export default PatientSettings