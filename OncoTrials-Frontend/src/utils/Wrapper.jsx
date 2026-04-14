import React, { useEffect, useState } from 'react';
import supabase from './SupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const validateUser = async () => {
    const response = await supabase.auth.getUser();

    if (!response.data.user) return false;

    return response;
}

function Wrapper({ children, path}) {
    const navigate = useNavigate();

    const { data: response, isLoading, isError } = useQuery({
        queryKey: ['validateUser'],
        queryFn: validateUser,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });


    // Handle navigation in useEffect to avoid setState during render
    useEffect(() => {
        if (isError || (!isLoading && (!response || !response.data.user))) {
            navigate(path, {replace: true});
        }
    }, [isError, isLoading, response, navigate]);

    if (isLoading) {
        return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Validating authentication...</p>
            </div>
        </div>)
    }
    if (isError || !response || !response.data.user) {
        return null;
    }

    return <>{children}</>;
}

export default Wrapper;