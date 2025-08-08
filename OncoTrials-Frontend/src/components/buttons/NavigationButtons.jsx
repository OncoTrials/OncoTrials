import React, { useState } from 'react';
import { SignOutIcon, HouseIcon, GearIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/SupabaseClient';
import { useMutation } from '@tanstack/react-query';

const logOutUser = async () => {
    const {error} = await supabase.auth.signOut();

    if (error) throw error;
}
const Card = () => {
    const [error, setError] = useState(false);

    const logOutMutation = useMutation({
        mutationFn: logOutUser,
        onSuccess: () => {
            // Redirect to home page after logout
            navigate('/', {replace: true});
        },
        onError: (error) => {
            setError(true);
            console.error('Logout error:', error.message);
        }
    })

    const handleLogout = async () => {
        logOutMutation.mutate();
    }

    const navigate = useNavigate();
    return (
        <div className="flex flex-col">
            <div className="py-2 flex gap-0.5 rounded-md">
                <div className="group relative px-2 cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full hover:text-white-500" onClick={() => navigate('/patient-dashboard', {replace: true})}>
                        <HouseIcon  size={28} color='white'/>
                    </div>
                    <span className="absolute top-8 left-[50%] -translate-x-[50%] z-20 origin-left scale-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-md transition-all duration-300 ease-in-out group-hover:scale-100">
                        Home
                    </span>
                </div>
                <div className="group relative px-2 cursor-pointer" onClick={() => navigate('/patient-settings', {replace: true})}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full hover:text-blue-500">
                        <GearIcon size={28} color='white'/>
                    </div>
                    <span className="absolute top-8 left-[50%] -translate-x-[50%] z-20 origin-left scale-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-md transition-all duration-300 ease-in-out group-hover:scale-100">
                        Settings
                    </span>
                </div>
                <div className="group relative px-2 cursor-pointer" onClick={() => handleLogout()}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full hover:text-blue-500">
                        <SignOutIcon size={28} color='white'/>
                    </div>
                    <span className="absolute top-8 left-[50%] -translate-x-[50%] z-20 origin-left scale-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-md transition-all duration-300 ease-in-out group-hover:scale-100">
                        Log Out
                    </span>
                </div>
            </div>
        </div>
    );
}

export default Card;
