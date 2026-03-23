import React, { useState, useEffect } from 'react';
import supabase from '../../utils/SupabaseClient';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const AUTOSAVE_KEY = 'patient_intake_draft';

const initialFormState = {
    full_name: '',
    dob: '',
    gender: '',
    phone_number: '',
    location: '',
    diagnosis: '',
    ecog_score: '',
    biomarkers: '',
    prior_treatment: '',
    line_of_treatment: '',
};

const sections = [
    {
        id: 'personal',
        label: 'Personal',
        icon: '○',
        fields: ['full_name', 'dob', 'gender', 'phone_number', 'location'],
    },
    {
        id: 'clinical',
        label: 'Clinical',
        icon: '□',
        fields: ['diagnosis', 'ecog_score', 'biomarkers', 'prior_treatment', 'line_of_treatment'],
    },
];

const fieldConfig = {
    full_name: { label: 'Full Name', type: 'text', required: true, placeholder: 'Jane Doe', span: 2 },
    dob: { label: 'Date of Birth', type: 'date', required: true, span: 1 },
    gender: {
        label: 'Gender', type: 'select', required: true, span: 1,
        options: [
            { value: '', label: 'Select' },
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Non-binary', label: 'Non-binary' },
            { value: 'Prefer not to say', label: 'Prefer not to say' },
        ]
    },
    phone_number: { label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000', span: 1 },
    prior_treatment: {
        label: 'Prior Treatment',
        type: 'select',
        placeholder: 'Yes or No',
        span: 1,
        options: [
            { value: '', label: 'Select' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
        ]
    },
    prior_treatment: {
        label: 'Line Of Treatment',
        type: 'select',
        placeholder: '1st line, 2nd line, or 3rd line',
        span: 1,
        options: [
            { value: '', label: 'Select' },
            { value: '1st', label: '1st line' },
            { value: '2nd', label: '2nd line' },
            { value: '3rd', label: '3rd line' },
        ]
    },
    location: { label: 'City / Location', type: 'text', placeholder: 'New York, NY', span: 2 },
    diagnosis: { label: 'Diagnosis', type: 'text', placeholder: 'e.g. Non-small cell lung carcinoma', span: 2 },
    ecog_score: {
        label: 'ECOG Score', type: 'select', span: 1,
        options: [
            { value: '', label: 'Select score' },
            { value: '0', label: '0 — Fully active' },
            { value: '1', label: '1 — Restricted strenuous activity' },
            { value: '2', label: '2 — Ambulatory, self-care only' },
            { value: '3', label: '3 — Limited self-care' },
            { value: '4', label: '4 — Fully disabled' },
            { value: '5', label: '5 — Deceased' },
        ]
    },
    biomarkers: { label: 'Biomarkers', type: 'text', placeholder: 'e.g. EGFR+, PD-L1 50%', span: 1 },
};

export default function PatientIntakeForm({ isOpen = true, onClose = () => { }, onSubmit }) {
    const [formData, setFormData] = useState(() => {
        try {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            return saved ? { ...initialFormState, ...JSON.parse(saved) } : initialFormState;
        } catch {
            return initialFormState;
        }
    });
    const [activeSection, setActiveSection] = useState('personal');
    const [status, setStatus] = useState(null); // 'success' | 'error' | null
    const [errorMsg, setErrorMsg] = useState('');
    //const [isPending, setIsPending] = useState(false);
    const [visited, setVisited] = useState({ personal: true, clinical: false });
    const [lastSaved, setLastSaved] = useState(null);
    const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(AUTOSAVE_KEY));

    const insertPatient = async ({formData, userId}) => {
        const { data, error } = await supabase.from('patients').insert([

            {
                patient_id: userId,
                full_name: formData.full_name,
                dob: formData.dob,
                gender: formData.gender,
                phone_number: formData.phone_number,
                location: formData.location,
                diagnosis: formData.diagnosis,
                ecog_score: formData.ecog_score,
                biomarkers: formData.biomarkers,
                prior_treatment: formData.prior_treatment === 'yes' ? true : false
            }
        ]);

        if (error) throw error;
        return data;
    }

    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: insertPatient
    });


    // Auto-save to localStorage on every formData change
    useEffect(() => {
        const isEmpty = Object.values(formData).every(v => v === '');
        if (!isEmpty) {
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
                setLastSaved(new Date());
                setHasDraft(true);
            } catch { /* storage full */ }
        }
    }, [formData]);

    // Reset on open only if no draft
    useEffect(() => {
        if (isOpen) {
            setStatus(null);
            setErrorMsg('');
            setActiveSection('personal');
            setVisited({ personal: true, clinical: false });
        }
    }, [isOpen]);

    const clearDraft = () => {
        localStorage.removeItem(AUTOSAVE_KEY);
        setFormData(initialFormState);
        setHasDraft(false);
        setLastSaved(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const goToSection = (id) => {
        setActiveSection(id);
        setVisited(prev => ({ ...prev, [id]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault()
        setStatus(null)

        try {
            const { data: { user } } = await supabase.auth.getUser();
            await mutation.mutateAsync({formData, userId: user.id});
            
            const { error: updateError } = await supabase
            .from('users')
            .update({ completedIntakeForm: true })
            .eq('id', user.id);

            if (updateError) throw updateError;

            localStorage.removeItem(AUTOSAVE_KEY)
            setHasDraft(false)
            setStatus('success')

            setTimeout(() => onClose(), 3000);

            navigate('/auth/callback', {replace: true});

        } catch (err) {
            setErrorMsg(err.message || 'Failed to save patient')
            setStatus('error')
        } 
    }

    const currentSection = sections.find(s => s.id === activeSection);
    const currentFields = currentSection?.fields || [];
    const currentIdx = sections.findIndex(s => s.id === activeSection);
    const isLast = currentIdx === sections.length - 1;

    const renderField = (key) => {
        const cfg = fieldConfig[key];
        if (!cfg) return null;
        const shared = {
            name: key,
            value: formData[key],
            onChange: handleChange,
            required: cfg.required,
            placeholder: cfg.placeholder || '',
            id: key,
        };

        const inputClass =
            'w-full bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all duration-150';

        let control;
        if (cfg.type === 'select') {
            control = (
                <select {...shared} className={inputClass}>
                    {cfg.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            );
        } else if (cfg.type === 'textarea') {
            control = (
                <textarea {...shared} rows={3} className={`${inputClass} resize-none`} />
            );
        } else {
            control = <input {...shared} type={cfg.type} className={inputClass} />;
        }

        return (
            <div key={key} className={cfg.span === 2 ? 'col-span-2' : 'col-span-1'}>
                <label htmlFor={key} className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    {cfg.label}{cfg.required && <span className="text-sky-500 ml-0.5">*</span>}
                </label>
                {control}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        .intake-root * { font-family: 'DM Sans', sans-serif; }
        .intake-root .serif { font-family: 'DM Serif Display', serif; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fields-anim { animation: slideUp 0.25s ease forwards; }
        @keyframes checkPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-anim { animation: checkPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
      `}</style>

            {/* Backdrop */}
            <div className="intake-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">

                {/* Card */}
                <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col" style={{ maxHeight: '92vh' }}>

                    {/* Top bar */}
                    <div className="bg-gradient-to-br from-sky-500 to-blue-600 px-8 pt-7 pb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="serif text-white text-2xl font-normal m-0">
                                    Patient Onboarding Form
                                </h2>
                                {/* Auto-save indicator */}
                                <div className="flex items-center gap-3 mt-1.5">
                                    {lastSaved && (
                                        <span className="text-sky-200 text-xs">
                                            ✓ Draft saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    {hasDraft && (
                                        <button
                                            type="button"
                                            onClick={clearDraft}
                                            className="text-xs text-sky-100 bg-white/10 border border-white/25 rounded px-2 py-0.5 hover:bg-white/20 transition-colors cursor-pointer"
                                        >
                                            Clear draft
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-white/15 hover:bg-white/25 text-white rounded-lg w-8 h-8 flex items-center justify-center transition-colors cursor-pointer border-0 text-base"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Section nav */}
                        <div className="flex gap-2 mt-5">
                            {sections.map((s, i) => (
                                <button
                                    type='button'
                                    key={s.id}
                                    onClick={() => goToSection(s.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer
                    ${activeSection === s.id
                                            ? 'bg-white/25 text-white border-transparent'
                                            : visited[s.id]
                                                ? 'bg-white/10 text-sky-100 border-sky-300/40 hover:bg-white/15'
                                                : 'bg-transparent text-white/70 border-white/25 hover:bg-white/10'
                                        }`}
                                >
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs ${activeSection === s.id ? 'bg-white/25' : 'bg-white/10'}`}>
                                        {i + 1}
                                    </span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form body */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-7">

                        {status === 'success' && (
                            <div className="check-anim flex flex-col items-center justify-center py-10">
                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl mb-4">
                                    ✓
                                </div>
                                <p className="serif text-xl text-blue-900 m-0">Patient Added Successfully</p>
                                <p className="text-slate-400 text-sm mt-1.5">Closing form…</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-700 text-sm">
                                {errorMsg}
                            </div>
                        )}

                        {status !== 'success' && (
                            <div key={activeSection} className="grid grid-cols-2 gap-x-5 gap-y-5 fields-anim">
                                {currentFields.map(renderField)}
                            </div>
                        )}

                        {/* Footer */}
                        {status !== 'success' && (
                            <div className="flex justify-between items-center mt-8 pt-5 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <div className="flex gap-2">
                                    {currentIdx > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => goToSection(sections[currentIdx - 1].id)}
                                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            ← Back
                                        </button>
                                    )}
                                    {!isLast && (
                                        <button
                                            type="button"
                                            onClick={() => goToSection(sections[currentIdx + 1].id)}
                                            className="px-5 py-2 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors cursor-pointer border-0"
                                        >
                                            Continue →
                                        </button>
                                    )} 
                                    {isLast && (
                                        <button
                                            type="submit"
                                            disabled={mutation.isPending}
                                            className="px-6 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer border-0"
                                        >
                                            {mutation.isPending ? 'Saving…' : 'Submit Patient'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
}