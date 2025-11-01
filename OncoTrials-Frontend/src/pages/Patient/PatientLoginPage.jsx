import React from 'react';
import HomeNavBar from '../../components/layout/HomeNavBar';
import LoginForm from '../../components/forms/PatientLoginForm';



function PatientLoginPage() {
  //bg-gradient-to-tr from-blue-50 via-blue-100 to-blue-200
  return (
    <div className='animate-fade-down  bg-gradient-to-br from-blue-100 via-white to-indigo-100'>
      <HomeNavBar />
      <div className="min-h-screen flex flex-col md:flex-row items-center justify-center px-6 py-12 gap-12">
        <div className="flex-shrink-0 w-full md:w-[400px]">
          <LoginForm />
        </div>
        <div className="flex justify-center items-center w-[600px] ">
          <img
            src="/workspace.png"
            alt="Illustration of a patient workspace"
            className="w-full max-w-[600px] h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default PatientLoginPage;
