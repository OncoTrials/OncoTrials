import React, { useState } from 'react'
import PhysicianNavbar from '../../components/layout/PhysicianNavbar'
import PasswordRequirements from '../../components/common/PasswordRequirements';
import { useMutation, useQuery } from '@tanstack/react-query';
import CustomAlert from '../../components/common/Alert';
import supabase from '../../utils/SupabaseClient';

/* ─── Supabase helpers (unchanged) ─────────────────────────────────── */
const updateEmail = async ({ email }) => {
    const { data, error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
    return data;
};

const updatePassword = async ({ password }) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
};

const getUserMetadata = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata || null;
};

/* ─── Reusable sub-components ────────────────────────────────────────── */
const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            {label}
        </label>
        {children}
    </div>
);

const Input = ({ type = 'text', value, onChange, placeholder, disabled }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 focus:bg-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    />
);

const PrimaryButton = ({ onClick, loading, loadingText, children, fullWidth }) => (
    <button
        onClick={onClick}
        className={`
      ${fullWidth ? 'w-full' : ''}
      inline-flex items-center justify-center gap-2
      px-6 py-2.5 rounded-xl
      bg-blue-950 hover:bg-blue-900 active:scale-95
      text-white text-sm font-medium tracking-wide
      shadow-md hover:shadow-lg
      transition-all duration-200 cursor-pointer
    `}
    >
        {loading ? (
            <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {loadingText}
            </>
        ) : children}
    </button>
);

const SectionDivider = () => (
    <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-slate-100" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        <div className="flex-1 h-px bg-slate-100" />
    </div>
);

/* ─── Main component ─────────────────────────────────────────────────── */
function PatientSettings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formData, setFormData] = useState({ name: '' });
    const [emailResponse, setEmailResponse] = useState('');
    const [passwordResponse, setPasswordResponse] = useState('');

    const updateEmailMutation = useMutation({
        mutationFn: updateEmail,
        onSuccess: () => {
            setEmailResponse('Please check your email for the verification link to confirm the change.');
            setEmail('');
        },
        onError: (error) => setEmailResponse(error.message),
    });

    const updatePasswordMutation = useMutation({
        mutationFn: updatePassword,
        onSuccess: () => setPasswordResponse('Password updated successfully'),
        onError: (error) => setPasswordResponse(error.message),
    });

    const { data: response } = useQuery({
        queryKey: ['getUserMetadata'],
        queryFn: getUserMetadata,
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const handleUpdateEmail = () => {
        if (!email) { setEmailResponse('Please enter a valid email address.'); return; }
        updateEmailMutation.mutate({ email });
    };

    const handleUpdatePassword = () => {
        if (!password) { setPasswordResponse('Please enter a valid password.'); return; }
        updatePasswordMutation.mutate({ password });
    };

    const handleClose = () => { setEmailResponse(''); setPasswordResponse(''); };

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'security', label: 'Security' },
    ];

    /* ── Profile tab ── */
    const profileSettings = () => (
        <div className="flex flex-col items-center gap-6">
            {/* Avatar with gradient ring */}
            <div className="p-0.5 rounded-full bg-gradient-to-br from-amber-400 to-blue-950 shadow-lg mt-1">
                <div className="w-24 h-24 rounded-full bg-blue-950 flex items-center justify-center">
                    <span className="text-white text-2xl font-semibold tracking-widest">{response?.email.slice(0,1).toUpperCase()}</span>
                </div>
            </div>

            <p className="text-xs font-semibold tracking-widest uppercase text-amber-500 -mt-2">
                Physician Profile
            </p>

            {/* Decorative separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />

            <div className="w-full flex flex-col gap-4">
                <Field label="Full Name">
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                    />
                </Field>

                <PrimaryButton fullWidth>
                    Save Changes
                </PrimaryButton>
            </div>
        </div>
    );

    /* ── Security tab ── */
    const securitySettings = () => (
        <div className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-4">
                <div>
                    <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 mb-3" />
                    <h3 className="text-lg font-semibold text-blue-950">Email Address</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Update your email address. A verification link will be sent to confirm the change.
                    </p>
                </div>

                <Field label="New Email">
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={updateEmailMutation.isPending}
                    />
                </Field>

                <PrimaryButton
                    onClick={handleUpdateEmail}
                    loading={updateEmailMutation.isPending}
                    loadingText="Updating…"
                >
                    Update Email
                </PrimaryButton>

                {updateEmailMutation.isError && <CustomAlert type="failure" message={emailResponse} onClose={handleClose} />}
                {updateEmailMutation.isSuccess && <CustomAlert type="success" message={emailResponse} onClose={handleClose} />}
            </div>

            <SectionDivider />

            {/* Password */}
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-blue-950">Password</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Choose a strong password to keep your account secure.
                    </p>
                </div>

                <Field label="New Password">
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        disabled={updatePasswordMutation.isPending}
                    />
                </Field>

                <PasswordRequirements password={password} />

                <PrimaryButton
                    onClick={handleUpdatePassword}
                    loading={updatePasswordMutation.isPending}
                    loadingText="Updating…"
                >
                    Update Password
                </PrimaryButton>

                {updatePasswordMutation.isError && <CustomAlert type="failure" message={passwordResponse} onClose={handleClose} />}
                {updatePasswordMutation.isSuccess && <CustomAlert type="success" message={passwordResponse} onClose={handleClose} />}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 animate-fade-down">
            <PhysicianNavbar user_email={response?.email} />

            {/* Page header */}
            <div className="px-8 pt-10">
                <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
                    Account Management
                </p>
                <h1 className="text-4xl font-bold text-blue-950 tracking-tight">
                    Profile Settings
                </h1>
            </div>

            {/* Centered layout */}
            <div className="flex flex-col items-center gap-6 px-4 py-10">

                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                px-7 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 cursor-pointer
                ${activeTab === tab.id
                                    ? 'bg-blue-950 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Card */}
                <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-8">
                    {activeTab === 'profile' && profileSettings()}
                    {activeTab === 'security' && securitySettings()}
                </div>

            </div>
        </div>
    );
}

export default PatientSettings;