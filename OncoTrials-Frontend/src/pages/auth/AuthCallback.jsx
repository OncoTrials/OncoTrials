import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/SupabaseClient';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return navigate('/patient-login');

            // store role in  users table
            // await supabase.from('users').upsert({
            //     role: session.user.user_metadata?.role || 'patient',
            // });

            //get role from the users table
            const {data : userRole, error}= await supabase.from('users').select('role').eq('id', session.user.id).single();

            if (error) throw error;

            // Redirect based on role
            const role = session.user.user_metadata?.role || userRole;
            if (role === 'patient') navigate('/patient-dashboard', { replace: true });
            else if (role === 'practitioner') navigate('/physician-dashboard', { replace: true });
            else if (role === 'crc') navigate('/crc-dashboard', { replace: true });
            else navigate('/', { replace: true });
        };

        checkSession();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600">Logging you in...</p>
        </div>
    );
}
