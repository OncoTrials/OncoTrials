import React, { useState } from 'react';
import { EyeClosedIcon, EyeIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import supabase from '../../utils/SupabaseClient';
import CustomAlert from '../common/Alert';
import { useNavigate } from 'react-router-dom';


const loginUser = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

function PhysicianCRCLoginForm() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const loginUserMutation = useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            setEmail('');
            setPassword('');
            navigate('/auth/callback' , {replace: true});

        },
        onError: (error) => {
            setMessage(error.message);
            console.error('Error logging in:', error.message);
        },
    })



    const handleSubmit = (e) => {
        e.preventDefault();

        if (!email || !password ) {
            return;
        }
        loginUserMutation.mutate({ email, password });
    }
    return (
        <>
            <div className="flex justify-center items-center min-h-screen">
                <div className='flex flex-row items-center justify-center'>
                    <div className="flex-shrink-0 max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                        <div className="space-y-2 text-center">
                            <h1 className="text-3xl font-bold">Welcome Back!</h1>
                            <p className="text-gray-600 dark:text-gray-400">Please log in to your account</p>
                        </div>
                        <div className="space-y-4">
                            <form id='form' method='POST' className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        type="email"
                                        id="email"
                                        name='email'
                                        value={email}
                                        disabled={loginUserMutation.isPending}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="jmensah123@example.com"
                                        required />
                                </div>
                                <div className=" relative space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                                    <div>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            type={isVisible ? "text" : "password"}
                                            id="password"
                                            name='password'
                                            value={password}
                                            disabled={loginUserMutation.isPending}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder='••••••••'
                                            required />
                                        <button type='button' onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon />) : (<EyeIcon />)}</button>
                                    </div>
                                </div>
                                <a href='/forgot-password' className='text-right text-sm text-blue-400 hover:underline cursor-pointer'>Forgot Password?</a>

                                <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                                    {loginUserMutation.isPending ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Logging in...
                                        </>
                                    ) : (
                                        'Log In'
                                    )}
                                </button>
                            </form>
                            {(loginUserMutation.isSuccess || message) && (
                                <CustomAlert
                                    type={loginUserMutation.isSuccess ? 'success' : 'failure'}
                                    message={message || 'Login successful! Redirecting...'}
                                    onClose={() => setMessage('')}
                                />
                            )}

                            <div className='flex justify-center'>
                                <p className='text-sm'>Don't have an account? <Link to='/physician-crc-register' className='text-blue-400 hover:underline'>Sign Up</Link></p>
                            </div>
                        </div>
                    </div>
                    <img src={'/workspace.png'} alt="Workspace Illustration" className='ml-10 h-[650px] mt-10' />
                </div>
            </div>
        </>
    )
}

export default PhysicianCRCLoginForm