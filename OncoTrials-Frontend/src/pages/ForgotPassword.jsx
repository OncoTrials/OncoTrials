import React, { useState } from 'react';
import HomeNavBar from '../components/HomeNavBar';
function ForgotPassword() {
    const [email, setEmail] = useState('');
    return (
        <>
            <div className='flex items-center justify-center min-h-screen animate-fade-down'>
                <HomeNavBar />
                    <div className="flex-shrink-0 max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                        <div className="space-y-2 text-center">
                            <h1 className="text-3xl font-bold">Reset Your Password</h1>
                            <p className="text-gray-600 dark:text-gray-400">We’ll email you instructions to reset your password. </p>
                        </div>
                        <div className="space-y-4">
                            <form id='form' method='POST' className='space-y-4'>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="jmensah123@example.com"
                                        required
                                    />
                                </div>

                                <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                                    <div className="flex items-center justify-center">
                                        Reset Password
                                    </div>
                                </button>
                            </form>
                            {/* <SuccessToast text={'Please check your email to confirm your account'} /> */}
                        </div>
                    </div>
                </div>
        </>
    )
}

export default ForgotPassword