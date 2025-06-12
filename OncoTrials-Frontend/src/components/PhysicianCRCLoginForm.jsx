import React, { useState } from 'react';
import { GoogleLogoIcon, FacebookLogoIcon, XIcon, EyeClosedIcon, EyeIcon, InfoIcon } from '@phosphor-icons/react'
import HomeNavBar from './HomeNavBar'
import { Link } from 'react-router-dom';

function PhysicianCRCLoginForm() {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="flex justify-center items-center min-h-screen animate-fade-down">
            <HomeNavBar />
            <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome Back!</h1>
                    <p className="text-gray-600 dark:text-gray-400">Please log in to your account</p>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                        <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="email" id="email" placeholder="jmensah123@example.com" required />
                    </div>
                    <div className=" relative space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                        <div>
                            <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type={isVisible ? "text" : "password"} id="password" placeholder='••••••••' required />
                            <button onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon />) : (<EyeIcon />)}</button>
                        </div>
                    </div>
                    <p className='text-right text-sm text-blue-400 hover:underline cursor-pointer'>Forgot Password?</p>
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
                            Log In
                        </div>
                    </button>

                    <div className='flex justify-center'>
                        <p className='text-sm'>Don't have an account? <Link to='/physician-crc-register' className='text-blue-400 hover:underline'>Sign Up</Link></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PhysicianCRCLoginForm