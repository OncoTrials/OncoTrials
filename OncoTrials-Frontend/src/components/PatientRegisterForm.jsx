import React, { useState } from 'react';
import { GoogleLogoIcon, FacebookLogoIcon, XIcon, EyeClosedIcon, EyeIcon, CheckIcon } from '@phosphor-icons/react'
import HomeNavBar from './HomeNavBar'
import { Link } from 'react-router-dom';
const PatientRegisterForm = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const passwordLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigitOrSymbol = /[\d\W]/.test(password);
    return (
        <div className="flex justify-center items-center min-h-screen animate-fade-down">
            <HomeNavBar/>
            <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome To OncoTrials!</h1>
                    <p className="text-gray-600 dark:text-gray-400">Please create your account</p>
                </div>
                <div className="space-y-4">
                    <form id='form' method='POST' className='space-y-4'>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                            <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            type="email" 
                            id="email" 
                            name='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jmensah123@example.com" r
                            equired />
                        </div>
                        <div className=" relative space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                            <div>
                                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type={isVisible ? "text" : "password"} 
                                id="password" 
                                name='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder='••••••••' required />
                                <button onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon/>) : (<EyeIcon/>)}</button>
                            </div>
                        </div>
                        <div className='space-y-0.5'>
                            <div className="">
                                <span className='inline-flex items-center'> {passwordLength ? <CheckIcon size={12} color='green'/> : <XIcon size={12} color='red'/>} <p className='text-xs font-medium text-gray-600'>At least 6 chars.</p></span>
                            </div>
                            <div className=" ">
                                <span className='inline-flex items-center'>{ hasUppercase ? <CheckIcon size={12} color='green'/> : <XIcon size={12} color='red'/>}<p className='text-xs font-medium text-gray-600'>At least 1 uppercase</p></span>
                            </div>
                            <div className=" ">
                                <span className='inline-flex items-center'>{ hasLowercase ? <CheckIcon size={12} color='green'/> : <XIcon size={12} color='red'/>}<p className='text-xs font-medium text-gray-600'>At least 1 lowercase</p></span>
                            </div>
                            <div className="">
                                <span className='inline-flex items-center'>{hasDigitOrSymbol ? <CheckIcon size={12} color='green'/> : <XIcon size={12} color='red'/>}<p className='text-xs font-medium text-gray-600'>At least 1 digit & symbol</p></span>
                            </div>
                        </div>

                        <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                                <div className="flex items-center justify-center">
                                    Create Account
                                </div>
                        </button>
                    </form>
                    <div className="flex items-center space-x-2">
                        <hr className="flex-grow border-zinc-200 dark:border-zinc-700" />
                        <span className="text-zinc-400 dark:text-zinc-500 text-sm">Or Continue With</span>
                        <hr className="flex-grow border-zinc-200 dark:border-zinc-700" />
                    </div>

                    <div className='flex flex-row gap-5 justify-center'>
                        <button className="inline-flex items-center justify-center  text-black hover:cursor-pointer">
                            <div className="flex items-center justify-center">
                                <FacebookLogoIcon size={32} />
                            </div>
                        </button>
                        <button className="inline-flex items-center justify-center text-black hover:cursor-pointer">
                            <div className="flex items-center justify-center">
                                <GoogleLogoIcon size={32} />
                            </div>
                        </button>
                    </div>
                    <div className='flex justify-center'>
                        <p className='text-sm'>Already have an account? <Link to='/patient-login' className='text-blue-400 hover:underline'>Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientRegisterForm;
