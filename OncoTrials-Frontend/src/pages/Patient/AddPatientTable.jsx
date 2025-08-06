import React, { useState } from 'react'
import { CaretUpIcon, CaretDownIcon, ArrowFatDownIcon, ArrowFatUpIcon } from '@phosphor-icons/react';
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

    //Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const trialsPerPage = 3;

    const totalPages = Math.ceil(sortedData.length / trialsPerPage);
    const startIndex = (currentPage - 1) * trialsPerPage;
    const endIndex = startIndex + trialsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    }

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    }


    const toggleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const openModal = (rowData) => setModalData(rowData);

    const closeModal = () => setModalData(null);
    return (
        <>
            <div>
                <table className='w-full min-w-[950px] h-[40rem] mt-5 table-auto bg-white shadow-xl'>
                    <thead>
                        <tr className='border-b bg-gradient-to-r from-slate-100 to-gray-100'>
                            <th
                                onClick={() => toggleSort("trial_name")}
                                className='py-5 px-6 text-left cursor-pointer hover:bg-gray-200 transition-colors duration-300 group'
                            >
                                <div className='flex items-center gap-2 text-md font-semibold tracking-wider'>
                                    Trial Name
                                    <div className='flex flex-col'>
                                        {sortField === "trial_name" && sortOrder === "asc" ? (<CaretUpIcon size={16} className='text-black' />) : sortField === "trial_name" && sortOrder === "desc" ? (<CaretDownIcon size={16} className='text-black' />) : (<div><CaretUpIcon size={16} className='opacity-40' /></div>)}
                                    </div>
                                </div>
                            </th>
                            <th
                                onClick={() => toggleSort("match_percentage")}
                                className='py-5 px-6 text-left cursor-pointer hover:bg-gray-200 transition-colors duration-300 group'
                            >
                                <div className='flex items-center gap-2 text-md font-semibold tracking-wider'>
                                    Match %
                                    <div className='flex flex-col'>
                                        {sortField === "match_percentage" && sortOrder === "asc" ? (<CaretUpIcon size={16} className='text-black' />) : sortField === "match_percentage" && sortOrder === "desc" ? (<CaretDownIcon size={16} className='text-black' />) : (<div><CaretUpIcon size={16} className='opacity-40' /></div>)}
                                    </div>
                                </div>
                            </th>
                            <th className='py-5 px-4 text-left hover:bg-gray-200 transition-colors duration-300 group'>Inclusion Criteria</th>
                            <th className='py-5 px-4 text-left hover:bg-gray-200 transition-colors duration-300 group'>Trial Status</th>
                            <th className='hover:bg-gray-200 transition-colors duration-300 group'>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((trial) => (
                                <tr key={trial.id} className='border-b hover:bg-sky-200/20 cursor-pointer' onClick={() => openModal(trial)}>
                                    <td className='px-6 font-semibold'>{trial.trial_name}</td>
                                    <td className='px-6'>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${trial.match_percentage >= 90 ? 'bg-green-200 text-black' : trial.match_percentage < 90 || trial.match_percentage > '50' ? 'bg-yellow-200 text-black' : 'bg-red-200 text-black'}`}>
                                        {trial.match_percentage}%
                                        </span>
                                        
                                        </td>
                                    <td className='px-4'>{trial.inclusion_text.slice(0, 25)}...</td>
                                    <td className='px-6'>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${trial.trial_status === 'Open' ? 'bg-green-200 text-black' : trial.trial_status === 'Recruiting' ? 'bg-yellow-200 text-black' : 'bg-red-200 text-black'}`}>
                                            <div className={`w-2 h-2 rounded-full mr-2 ${trial.trial_status === 'Open'
                                                ? 'bg-green-500 animate-pulse'
                                                : trial.trial_status === 'Recruiting'
                                                    ? 'bg-yellow-600 animate-pulse'
                                                    : 'bg-red-500'
                                                }`}></div>

                                            {trial.trial_status}
                                        </span>
                                    </td>
                                    <td className='py-2 px-4'>
                                        <ViewDetailsButtons onClick={() => openModal(trial)} Text={'View Details'} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className='py-4 px-4 text-center text-3xl text-gray-500'>No trials found. Please try adjusting your search criteria</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {modalData && (
                    <div className='fixed inset-0 flex items-center justify-center z-50' style={{ backgroundColor: "rgba(0,0,0,0.9)" }}>
                        <div className='bg-white p-6 rounded-lg shadow-lg max-w-lg w-full space-y-2'>
                            <h2 className='text-2xl font-semibold mb-4'>{modalData.trial_name}</h2>
                            <p><strong>Match Percentage:</strong> {modalData.match_percentage}%</p>
                            <p><strong>Inclusion Criteria:</strong> {modalData.inclusion_text}</p>
                            <div className='inline-flex items-center gap-1'>
                                <p><strong>Status:</strong> </p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${modalData.trial_status === 'Open' ? 'bg-green-200 text-black' : modalData.trial_status === 'Recruiting' ? 'bg-yellow-200 text-black' : 'bg-red-200 text-black'}`}>
                                    <div className={`w-2 h-2 rounded-full mr-2 ${modalData.trial_status === 'Open'
                                        ? 'bg-green-500 animate-pulse'
                                        : modalData.trial_status === 'Recruiting'
                                            ? 'bg-yellow-600 animate-pulse'
                                            : 'bg-red-500'
                                        }`}></div>

                                    {modalData.trial_status}
                                </span>
                            </div>

                            <p><strong>Location:</strong> {modalData.trial_location}</p>
                            <p><strong>Contact Information:</strong> {modalData.trial_contact}</p>
                            <p><strong>Description:</strong> {modalData.trial_description}</p>
                            <button onClick={closeModal} className='mt-4 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-700 hover:scale-105'>Close</button>
                        </div>
                    </div>
                )}
                <div className='flex justify-between mt-4'>

                    <button
                        class="bg-white text-center w-28 rounded-2xl h-11 relative text-black text-md font-semibold group outline disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                        type="button"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                    >
                        <div
                            class="bg-green-400 rounded-xl h-9 w-6 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[105px] group-disabled:w-6 z-10 duration-500"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 1024 1024"
                                height="25px"
                                width="25px"
                            >
                                <path
                                    d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                                    fill="#000000"
                                ></path>
                                <path
                                    d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                                    fill="#000000"
                                ></path>
                            </svg>


                        </div>
                        <p class="translate-x-3">Previous</p>
                    </button>

                    <span className='mt-2'>{paginatedData.length === 0 ? `No Pages` : `Page ${currentPage} of ${totalPages}`}</span>

                    <button
                        class="bg-white text-center w-28 rounded-2xl h-11 relative text-black text-md font-semibold group outline disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                        type="button"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        <div
                            class="bg-green-400 rounded-xl h-9 w-6 flex items-center justify-center absolute right-1 top-[4px] group-hover:w-[105px] group-disabled:w-6 z-10 duration-500"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 256 256"
                                class="h-6 w-6">
                                <rect
                                    width="256"
                                    height="256" fill="none" />
                                <line
                                    x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" />
                                <polyline points="144 56 216 128 144 200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" />
                            </svg>


                        </div>
                        <p class="translate-x-[-10]">Next</p>
                    </button>

                </div>
            </div>
        </>
    )
}

export default AddPatientTable