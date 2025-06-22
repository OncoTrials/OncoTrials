import React, { useState } from 'react'
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react';
import ViewDetailsButtons from '../../components/buttons/ViewDetailsButtons';

function AddPatientTable() {
    const [sortField, setSortField] = useState(null);
    const [sortOrder, setSortOrder] = useState("asc");
    const [modalData, setModalData] = useState(null);

    const mockTrials = [
        {
            id: 1,
            trial_name: "Trial A",
            match_percentage: 85,
            inclusion_text: "Age 18-65, must have stage II cancer",
            trial_status: "Open",
            trial_location: "City Hospital",
            trial_contact: "Dr. Smith",
            trial_description: "A trial for testing new cancer drug A.",
        },
        {
            id: 2,
            trial_name: "Trial B",
            match_percentage: 90,
            inclusion_text: "Age 30-70, must have stage III cancer",
            trial_status: "Recruiting",
            trial_location: "General Hospital",
            trial_contact: "Dr. Johnson",
            trial_description: "A trial for testing new cancer drug B.",
        },
        {
            id: 3,
            trial_name: "Trial C",
            match_percentage: 75,
            inclusion_text: "Age 20-60, must have stage IV lung cancer",
            trial_status: "Closed",
            trial_location: "Specialty Clinic",
            trial_contact: "Dr. Lee",
            trial_description: "A trial for testing new cancer drug C.",
        },
        {
            id: 4,
            trial_name: "Trial D",
            match_percentage: 80,
            inclusion_text: "Age 25-65, must have stage I breast cancer",
            trial_status: "Open",
            trial_location: "Cancer Center",
            trial_contact: "Dr. Patel",
            trial_description: "A trial for testing new cancer drug D.",
        },
        {
            id: 5,
            trial_name: "Trial E",
            match_percentage: 95,
            inclusion_text: "Age 18-70, must have stage II colorectal cancer",
            trial_status: "Recruiting",
            trial_location: "University Hospital",
            trial_contact: "Dr. Kim",
            trial_description: "A trial for testing new cancer drug E.",
        },
        {
            id: 6,
            trial_name: "Trial F",
            match_percentage: 88,
            inclusion_text: "Age 30-75, must have stage III prostate cancer",
            trial_status: "Closed",
            trial_location: "City Cancer Institute",
            trial_contact: "Dr. Brown",
            trial_description: "A trial for testing new cancer drug F.",
        },
        {
            id: 7,
            trial_name: "Trial G",
            match_percentage: 92,
            inclusion_text: "Age 20-65, must have stage IV ovarian cancer",
            trial_status: "Open",
            trial_location: "Regional Hospital",
            trial_contact: "Dr. Garcia",
            trial_description: "A trial for testing new cancer drug G.",
        },
        {
            id: 8,
            trial_name: "Trial H",
            match_percentage: 78,
            inclusion_text: "Age 25-70, must have stage I pancreatic cancer",
            trial_status: "Recruiting",
            trial_location: "Metropolitan Clinic",
            trial_contact: "Dr. Martinez",
            trial_description: "A trial for testing new cancer drug H.",
        },
        {
            id: 9,
            trial_name: "Trial I",
            match_percentage: 85,
            inclusion_text: "Age 18-65, must have stage II kidney cancer",
            trial_status: "Closed",
            trial_location: "City Medical Center",
            trial_contact: "Dr. Wilson",
            trial_description: "A trial for testing new cancer drug I.",
        },
        {
            id: 10,
            trial_name: "Trial J",
            match_percentage: 90,
            inclusion_text: "Age 30-70, must have stage III liver cancer",
            trial_status: "Open",
            trial_location: "National Cancer Institute",
            trial_contact: "Dr. Anderson",
            trial_description: "A trial for testing new cancer drug J.",
        },
    ]

    const sortedData = [...mockTrials].sort((a, b) => {
        if (!sortField) return 0;
        if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
        if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const toggleSort = (field) => {
        setSortField(field);
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    };

    const openModal = (rowData) => setModalData(rowData);

    const closeModal = () => setModalData(null);
    return (
        <>
            <table className='min-w-full mt-5 table-auto'>
                <thead>
                    <tr className='border-b'>
                        <th onClick={() => toggleSort("trial_name")} className='py-2 px-4 text-left cursor-pointer'>Trial Name {sortField === "name" && (sortOrder === "asc" ? <CaretUpIcon size={8} className='text-black'/> : <CaretDownIcon size={8} />)}</th>
                        <th onClick={() => toggleSort("match_percentage")} className='py-2 px-4 text-left cursor-pointer'>Match Percentage {sortField === "name" && (sortOrder === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}</th>
                        <th className='py-2 px-4 text-left cursor-pointer'>Inclusion Criteria {sortField === "name" && (sortOrder === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}</th>
                        <th onClick={() => toggleSort("trial_status")} className='py-2 px-4 text-left cursor-pointer'>Trial Status {sortField === "name" && (sortOrder === "asc" ? <CaretUpIcon size={8} /> : <CaretDownIcon size={8} />)}</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.length > 0 ? (
                        sortedData.map((trial) => (
                            <tr key={trial.id} className='border-b hover:bg-gray-200 cursor-pointer'>
                                <td className='py-7 px-4'>{trial.trial_name}</td>
                                <td className='py-2 px-4'>{trial.match_percentage}%</td>
                                <td className='py-2 px-4'>{trial.inclusion_text}</td>
                                <td className='py-2 px-4'>
                                    <div className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${trial.trial_status === 'Open' ? 'bg-green-200 text-black' : trial.trial_status === 'Recruiting' ? 'bg-yellow-200 text-black' : 'bg-red-200 text-black'}`}>
                                        {trial.trial_status}
                                    </div>

                                </td>
                                <td className='py-2 px-4'>
                                    <ViewDetailsButtons onClick={() => openModal(trial)} />
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className='py-4 px-4 text-center text-gray-500'>No trials found</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {modalData && (
                <div className='fixed inset-0 flex items-center justify-center  z-50'>
                    <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full'>
                        <h2 className='text-xl font-semibold mb-4'>{modalData.trial_name}</h2>
                        <p><strong>Match Percentage:</strong> {modalData.match_percentage}%</p>
                        <p><strong>Inclusion Criteria:</strong> {modalData.inclusion_text}</p>
                        <p><strong>Status:</strong> {modalData.trial_status}</p>
                        <p><strong>Location:</strong> {modalData.trial_location}</p>
                        <p><strong>Contact Information:</strong> {modalData.trial_contact}</p>
                        <p><strong>Description:</strong> {modalData.trial_description}</p>
                        <button onClick={closeModal} className='mt-4 px-4 py-2 bg-blue-500 text-white rounded'>Close</button>
                    </div>
                </div>
            )}
        </>
    )
}

export default AddPatientTable