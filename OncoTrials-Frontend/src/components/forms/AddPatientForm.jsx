import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../utils/SupabaseClient';

// 1. Fixed the insert logic. 
// Supabase expects an array of objects or a single object matching column names.
// pass 'patientData' directly, don't wrap it in another object unless you have a JSONB column named 'patientData'.
const insertPatient = async (patientData) => {
    const { data, error } = await supabase
        .from('patients')
        .insert([patientData]) // Insert as an array
        .select();

    if (error) {
        throw error;
    }
    return data;
};

function AddPatientForm({ isOpen, onClose }) {
    const queryClient = useQueryClient(); // Used to refresh the list after adding
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 2. Define initial state for the form
    const initialFormState = {
        full_name: '',
        dob: '',
        gender: '',
        location: '',
        diagnosis: '',
        ecog_score: '',
        biomarkers: '',
        // Add other columns from your Supabase 'patients' table here
    };

    const [formData, setFormData] = useState(initialFormState);

    // 3. Reset form when modal closes or opens
    useEffect(() => {
        if (isOpen) {
            setSuccessMessage('');
            setErrorMessage('');
            setFormData(initialFormState);
        }
    }, [isOpen]);

    const insertPatientMutation = useMutation({
        mutationFn: insertPatient,
        onSuccess: () => {
            setSuccessMessage('Patient successfully added!');
            setErrorMessage('');
            setFormData(initialFormState);

            // Optional: Refetch the patients list so the new data shows up immediately
            queryClient.invalidateQueries({ queryKey: ['patients'] });

            // Optional: Close modal automatically after 2 seconds
            setTimeout(() => {
                onClose();
            }, 1500);
        },
        onError: (error) => {
            setErrorMessage(error.message);
            setSuccessMessage('');
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        insertPatientMutation.mutate(formData);
    };

    // 4. Return null if modal is closed
    if (!isOpen) return null;

    return (
        // Modal Backdrop
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">

            {/* Modal Container */}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Add New Patient</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Feedback Messages */}
                    {successMessage && (
                        <div className="p-3 bg-green-100 text-green-700 rounded text-sm">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label for='gender' className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value='' disabled>Select Gender</option>
                                <option value={'Male'}>Male</option>
                                <option value={'Female'}>Female</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                        <input
                            type="text"
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ECOG Score</label>
                        <input
                            type="number"
                            name="ecog_score"
                            min={'0'}
                            max={'5'}
                            value={formData.ecog_score}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Biomarkers</label>
                        <input
                            type="text"
                            name="biomarkers"
                            value={formData.biomarkers}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={insertPatientMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {insertPatientMutation.isPending ? 'Saving...' : 'Add Patient'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddPatientForm;