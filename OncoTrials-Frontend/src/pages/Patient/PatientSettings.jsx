import React, { useState } from 'react'
import PatientNavBar from '../../components/PatientNavBar'
import { CameraIcon } from '@phosphor-icons/react';
import PasswordRequirements from '../../components/PasswordRequirements';
import { useMutation, useQuery } from '@tanstack/react-query';
import CustomAlert from '../../components/Alerts/Alert';
import supabase from '../../utils/SupabaseClient';

const updateEmail = async ({ email }) => {
  const { data, error } = await supabase.auth.updateUser({
    email: email,
  });

  if (error) throw error;

  return data;
}

const updatePassword = async ({ password }) => {
  const { data, error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) throw error;

  return data;
}

const getUserMetadata = async () => {
  const { data: { user } } = await supabase.auth.getUser();


  return user?.user_metadata || null;
}

function PatientSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
  });
  const [emailResponse, setEmailResponse] = useState('');
  const [passwordResponse, setPasswordResponse] = useState('');
  const [userData, setUserData] = useState(null);

  const updateEmailMutation = useMutation({
    mutationFn: updateEmail,
    onSuccess: () => {
      setEmailResponse('Please check your email for the verification link to confirm the change.');
      setEmail('');
    },
    onError: (error) => {
      setEmailResponse(`${error.message}`);
    }
  });

  const handleUpdateEmail = () => {
    if (!email) {
      setEmailResponse('Please enter a valid email address.');
      return;
    }
    updateEmailMutation.mutate({ email });
  }

  const handleUpdatePassword = () => {
    if (!password) {
      setPasswordResponse('Please enter a valid password.');
      return;
    }
    updatePasswordMutation.mutate({ password });
  }

  const handleClose = () => {
    setEmailResponse('');
    setPasswordResponse('');
  }

  const updatePasswordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      setPasswordResponse('Password updated successfully');
    },
    onError: (error) => {
      setPasswordResponse(`${error.message}`);
    }
  });

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['getUserMetadata'],
    queryFn: getUserMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

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
            value={email}
            disabled={updateEmailMutation.isPending}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Input email'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button onClick={() => handleUpdateEmail()} className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors cursor-pointer'>
            <div className='flex items-center justify-center'>
              {updateEmailMutation.isPending ? (<> <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Updating Email... </>) : 'Update Email'}
            </div>
          </button>
          {updateEmailMutation.isError && <CustomAlert type={'failure'} message={emailResponse} onClose={handleClose} />}
          {updateEmailMutation.isSuccess && <CustomAlert type={'success'} message={emailResponse} onClose={handleClose} />}
        </div>
      </div>

      {/* Divider */}
      <hr className='border-gray-300' />

      {/* Password Section */}
      <div>
        <h3 className='text-lg font-semibold mb-2'>Password</h3>
        <div className='space-y-3'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              New Password
            </label>
            <input
              type='password'
              name='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={updatePasswordMutation.isPending}
              placeholder='Input password'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <PasswordRequirements password={password} />

          <button onClick={() => handleUpdatePassword()} className='bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors cursor-pointer'>
            <div className='flex items-center justify-center'>
              {updatePasswordMutation.isPending ? (<> <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Updating Password... </>) : 'Update Password'}
            </div>

          </button>
          {updatePasswordMutation.isError && <CustomAlert type={'failure'} message={passwordResponse} onClose={handleClose} />}
          {updatePasswordMutation.isSuccess && <CustomAlert type={'success'} message={passwordResponse} onClose={handleClose} />}
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
      <PatientNavBar user_email={response?.email}/>
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