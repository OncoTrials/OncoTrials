import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/SupabaseClient';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return navigate('/patient-login');

            // Optional: store extra info in  users table
            await supabase.from('users').upsert({
                role: session.user.user_metadata?.role || 'patient',
            });

            // Redirect based on role
            const role = session.user.user_metadata?.role || 'patient'; // Replace with actual role from users table
            if (role === 'patient') navigate('/patient-dashboard', { replace: true });
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
