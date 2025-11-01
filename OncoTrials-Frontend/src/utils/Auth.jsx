import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import supabase from './SupabaseClient';
import LoadingScreen from '../components/common/LoadingScreen';
import { useQuery } from '@tanstack/react-query';

const fetchUserRole = async (userId) => {
    const {data: userData, error} = await supabase.from('users').select('role').eq('id', userId).single();

    if (error) throw error;

    return userData?.role || null;
}


const AuthContext = createContext(null);

// Provider: stores user + loading state
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user);
            setLoading(false);
        });

        // Listen for login/logout
        const { data: subscription } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user);
                setSession(session);
            }
        );


        return () => subscription.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook: easy access to context
export function useAuth() {
    return useContext(AuthContext);
}

/**
 * RequireAuth:
 * - Redirects if not logged in
 * - Optionally checks user role
 */
export function RequireAuth({ redirectTo, allowedRoles }) {
    const { user, session, loading } = useAuth();
    const userId = user?.id;

    const { data: role, isLoading: roleIsLoading, isError } = useQuery({
        queryKey: ['userRole', userId],
        queryFn: () => fetchUserRole(userId),
        enabled: !!userId, // Only fetch if userId exists
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        refetchOnWindowFocus: false,
    });

    if (loading || roleIsLoading) {
        return <LoadingScreen message='Validating Authentication...' />;
    }

    // Not logged in → redirect
    if (!session) return <Navigate to={redirectTo} replace />;

    // Check role if provided
    const profileRole = role || user?.user_metadata?.role; // fallback
    if (allowedRoles && !allowedRoles.includes(profileRole)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

