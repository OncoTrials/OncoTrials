import PatientIntakeForm from "../../components/forms/PatientIntakeForm";
import { useNavigate } from "react-router-dom";
import supabase from "../../utils/SupabaseClient";
import { useAuth } from "../../utils/Auth";

export default function PatientOnboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleSubmit = async (formData) => {
        const { error } = await supabase
            .from('patients')
            .insert([{ ...formData, user_id: user.id }])
            .select();

        if (error) throw error;
        navigate('/patient-login');
    };

    return (
        <PatientIntakeForm
            isOpen={true}
            onClose={() => navigate('/patient-login')} 
            onSubmit={handleSubmit}
        />
    );
}