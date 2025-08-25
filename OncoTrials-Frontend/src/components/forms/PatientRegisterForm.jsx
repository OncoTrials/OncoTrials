import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GoogleLogoIcon, FacebookLogoIcon, XIcon, EyeClosedIcon, EyeIcon, CheckIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom';
import supabase from '../../utils/SupabaseClient';
import FacebookOAuth from '../buttons/FacebookOAuth';
import GoogleOAuth from '../buttons/GoogleOAuth';
import PasswordRequirements from '../common/PasswordRequirements.jsx';
import CustomAlert from '../common/Alert';

const signUpUser = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options:{
            data: {
                role: 'patient'
            }
        }
    });

    if (error) {
        throw error;
    }

    return data;
};



const PatientRegisterForm = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState(false);
    const [signUpError, setSignUpError] = useState(false);

    // Password validation
    const passwordLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigitAndSymbol = /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const signUpMutation = useMutation({
        mutationFn: signUpUser,
        onSuccess: (data) => {
            console.log('Sign up successful:', data);
            setEmail('');
            setPassword('');
            document.getElementById('form').reset();
        },
        onError: (error) => {
            console.error('Sign up error:', error.message);
            setSignUpError(true);
        },
    });


    const handleGoogleSignIn = async () => {
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });
        } catch (error) {
            console.error('Google sign-in error:', error.message);
            setSignUpError(true);
        }
    }


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!passwordLength || !hasUppercase || !hasLowercase || !hasDigitAndSymbol) {
            setFormError(true);
            return;
        }

        signUpMutation.mutate({ email, password });
    };

    const handleClose = () => {
        setFormError(false);
        setSignUpError(false);
    }

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="max-w-md w-full rounded-lg shadow-2xl  p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome To OncoTrials!</h1>
                    <p className="text-gray-600 dark:text-gray-400">Please create your account</p>
                </div>

                {signUpMutation.isSuccess && (
                    <CustomAlert type='success' message={'Please check your email to confirm your account'}/>
                )}

                {signUpError && (
                    <CustomAlert type='failure' message={signUpMutation.error?.message || 'An error occurred during sign up'} onClose={handleClose}/>
                )}

                {formError && (
                    <CustomAlert type='warning' message={'Password must meet the requirements'} onClose={handleClose}/>
                )}

                <div className="space-y-4">
                    <form id='form' method='POST' className='space-y-4' onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                Email
                            </label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="email"
                                id="email"
                                name='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jmensah123@example.com"
                                disabled={signUpMutation.isPending}
                                required
                            />
                        </div>

                        <div className="relative space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                Password
                            </label>
                            <div>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    type={isVisible ? "text" : "password"}
                                    id="password"
                                    name='password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder='••••••••'
                                    disabled={signUpMutation.isPending}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsVisible(!isVisible)}
                                    className='absolute right-5 top-9'
                                    disabled={signUpMutation.isPending}
                                >
                                    {isVisible ? (<EyeClosedIcon />) : (<EyeIcon />)}
                                </button>
                            </div>
                        </div>

                        {/* Password requirements */}
                        <PasswordRequirements password={password}/>

                        <button
                            id='submitBtn'
                            type='submit'
                            disabled={signUpMutation.isPending || signUpMutation.isSuccess}
                            className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-blue-500 text-white hover:cursor-pointer hover:scale-105 hover:bg-blue-600 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center justify-center">
                                {signUpMutation.isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="flex items-center space-x-2">
                        <hr className="flex-grow border-zinc-200 dark:border-zinc-700" />
                        <span className="text-zinc-400 dark:text-zinc-500 text-sm">Or Continue With</span>
                        <hr className="flex-grow border-zinc-200 dark:border-zinc-700" />
                    </div>

                    <div className='flex flex-row gap-5 justify-center'>
                        <FacebookOAuth />
                        <GoogleOAuth handleGoogleSignIn={handleGoogleSignIn} />
                    </div>

                    <div className='flex justify-center'>
                        <p className='text-sm'>
                            Already have an account?
                            <Link to='/patient-login' className='text-blue-400 hover:underline'> Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientRegisterForm;