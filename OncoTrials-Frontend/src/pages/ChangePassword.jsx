import React, { useState } from 'react';
import { XIcon, EyeClosedIcon, EyeIcon, InfoIcon, CheckIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom';
import PasswordRequirements from '../components/PasswordRequirements';
import supabase from '../utils/SupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

const resetPassword = async ({password}) => {
    const {data, error} = await supabase.auth.updateUser({
        password: password
    })

    if (error) throw error;

    return data;
}

function ChangePassword() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [PasswordRequirementsError, setPasswordRequirementsError] = useState(false);

    const resetPasswordMutation = useMutation({
        mutationFn: resetPassword,
        onSuccess: (data) => {
            setMessage('Password changed successfully!');
            navigate('/', {replace: true});
            setPassword('');
        },
        onError: (error) => {
            setMessage(`${error.message}`);
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault();
        // if (password.length < 6) {
        //     setPasswordRequirementsError(true);
        //     return;
        // }
        resetPasswordMutation.mutate({password});
    }
    



    return (
        <div className="flex justify-center items-center min-h-screen animate-fade-down bg-gradient-to-br from-blue-100 via-white to-indigo-100">
            <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Change Password</h1>
                    
                </div>
                <div className="space-y-4">
                    <form id='form' method='POST' className='space-y-4'>
                        <div className=" relative space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                            <div>
                                <input 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type={isVisible ? "text" : "password"} 
                                id="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder='••••••••' 
                                required />
                                <button type='button' onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon/>) : (<EyeIcon/>)}</button>
                            </div>
                        </div>
                        <PasswordRequirements password={password} />

                        <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                                <div className="flex items-center justify-center">
                                    Change Password
                                </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChangePassword