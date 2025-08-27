import React, { useState } from 'react';
import { XIcon, EyeClosedIcon, EyeIcon, InfoIcon, CheckIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom';
import PasswordRequirements from '../common/PasswordRequirements';
import { useMutation } from '@tanstack/react-query';
import supabase from '../../utils/SupabaseClient';
import CustomAlert from '../common/Alert';

const createUser = async ({ email, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: role }
        }
    });


    if (error) throw error;
    return data;
}



function PhysicianCRCRegisterForm() {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState("");

    const createUserMutation = useMutation({
        mutationFn: createUser,
        onSuccess: (data) => {
            setEmail('');
            setPassword('');
            setRole('');
        },
        onError: (error) => {
            console.error('Error creating user:', error.message);
        },
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password || !role) {
            return;
        }


        createUserMutation.mutate({ email, password, role });
    }



    return (
        <div className="flex justify-center items-center min-h-screen animate-fade-down">
            <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome To OncoTrials!</h1>

                </div>
                <div className="space-y-4">
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <InfoIcon size={12} className='text-gray-600' />
                        <p className="text-gray-600 text-sm">Please use your institutional email</p>
                    </div>
                    <form id='form' method='POST' className='space-y-4' onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="email"
                                id="email"
                                value={email}
                                disabled={createUserMutation.isPending}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jmensah123@example.com"
                                required
                            />
                        </div>
                        <div className=" relative space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                            <div>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    type={isVisible ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    disabled={createUserMutation.isPending}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder='••••••••'
                                    required />
                                <button type='button' onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon />) : (<EyeIcon />)}</button>
                            </div>
                        </div>
                        <PasswordRequirements password={password} />
                        <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="confirm-password">Role</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={createUserMutation.isPending}
                                required>
                                <option value="" disabled defaultValue>Select your role</option>
                                <option value="practitioner">Physician</option>
                                <option value="crc">Clinical Research Coordinator</option>
                            </select>
                        </div>

                        <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer">
                            {createUserMutation.isPending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>
                    
                    {createUserMutation.isSuccess && (
                        <CustomAlert type="success" message="Account created successfully! Please check your email to verify your account." />
                    )}
                    {createUserMutation.isError && (
                        <CustomAlert type="failure" message={createUserMutation.error.message} />
                    )}
                    <div className='flex justify-center'>
                        <p className='text-sm'>Already have an account? <Link to='/physician-crc-login' className='text-blue-400 hover:underline'>Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PhysicianCRCRegisterForm