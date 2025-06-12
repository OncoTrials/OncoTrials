import React, { useState } from 'react';
import { GoogleLogoIcon, FacebookLogoIcon, XIcon, EyeClosedIcon, EyeIcon, InfoIcon } from '@phosphor-icons/react'
import HomeNavBar from './HomeNavBar'
import { Link } from 'react-router-dom';

function PhysicianCRCRegisterForm() {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="flex justify-center items-center min-h-screen animate-fade-down">
            <HomeNavBar/>
            <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome To OncoTrials!</h1>
                    {/* <p className="text-gray-600 dark:text-gray-400">Please create your account</p> */}
                </div>
                <div className="space-y-4">
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <InfoIcon size={12} className='text-gray-600' />
                        <p className="text-gray-600 text-sm">Please use your institutional email</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                        <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="email" id="email" placeholder="jmensah123@example.com" required />
                    </div>
                    <div className=" relative space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                        <div>
                            <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type={isVisible ? "text" : "password"} id="password" placeholder='••••••••' required />
                            <button onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon/>) : (<EyeIcon/>)}</button>
                        </div>
                    </div>
                    <div className=''>
                        <div className="">
                            <span className='inline-flex items-center'><XIcon size={12} color='red'/><p className='text-xs font-medium text-gray-600'>At least 6 chars.</p></span>
                        </div>
                        <div className=" ">
                            <span className='inline-flex items-center'><XIcon size={12} color='red'/><p className='text-xs font-medium text-gray-600'>At least 1 uppercase</p></span>
                        </div>
                        <div className=" ">
                            <span className='inline-flex items-center'><XIcon size={12} color='red'/><p className='text-xs font-medium text-gray-600'>At least 1 lowercase</p></span>
                        </div>
                        <div className="">
                            <span className='inline-flex items-center'><XIcon size={12} color='red'/><p className='text-xs font-medium text-gray-600'>At least 1 digit & symbol</p></span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="confirm-password">Role</label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" id="role" required>
                            <option value="" disabled selected>Select your role</option>
                            <option value="physician">Physician</option>
                            <option value="clinical-research-coordinator">Clinical Research Coordinator</option>
                        </select>
                    </div>

                    <button className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                            <div className="flex items-center justify-center">
                                Create Account
                            </div>
                    </button>

                    <div className='flex justify-center'>
                        <p className='text-sm'>Already have an account? <Link to='/physician-crc-login' className='text-blue-400 hover:underline'>Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PhysicianCRCRegisterForm