import { ArrowCircleLeftIcon, ArrowCircleRightIcon, DotsThreeCircleIcon } from '@phosphor-icons/react';
import React, { useState } from 'react'

function TrialsTable({ trials }) {

    const [modalData, setModalData] = useState([]);

    //Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const trialsPerPage = 6;

    const totalPages = Math.ceil(trials.length / trialsPerPage);
    const startIndex = (currentPage - 1) * trialsPerPage;
    const endIndex = startIndex + trialsPerPage;
    const paginatedData = trials.slice(startIndex, endIndex);

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

    const convertStatus = (status) => {
        if (!status) return;
        switch (status.toLowerCase()) {
            case 'recruiting':
                return 'Recruiting'
            case 'not_yet_recruiting':
                return 'Not Yet Recruiting'
            case 'active_not_recruiting':
                return 'Active Not Recruiting'
            case 'enrolling_by_invitation':
                return 'Enrolling By Invitation'
            default:
                return 'Unavailabe'
        }
    }

    const getStatusColor = (status) => {
        if (!status) return;
        switch (status.toLowerCase()) {
            case 'recruiting':
                return 'bg-green-300'
            case 'not_yet_recruiting':
                return 'bg-yellow-200'
            case 'active_not_recruiting':
                return 'bg-gray-300'
            case 'enrolling_by_invitation':
                return 'bg-blue-400'
            default:
                return 'bg-red-400'
        }
    }


    return (
        <>
            {trials && trials.length > 0 ?
                (<div className="overflow-hidden">
                    <table className='w-full'>
                        <thead className='bg-gray-50 border-b-2 border-gray-200'>
                            <tr>
                                <th className='w-72 p-3 text-md font-semibold tracking-wide text-left'>Title</th>
                                <th className='w-48 p-3 text-md font-semibold tracking-wide text-left'>Status</th>
                                <th className='p-3 text-md font-semibold tracking-wide text-left'>I/E Criteria</th>
                                <th className='w-48 p-3 text-md font-semibold tracking-wide text-left'>Cancer Type</th>
                                <th className='p-3 text-md font-semibold tracking-wide text-left'>Actions</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                            {paginatedData.map(trial => (
                                <tr key={trial.id} className='hover:bg-gray-200 transition odd:bg-gray-100'>
                                    <td className='p-3 text-sm font-semibold text-gray-700'>{trial.title}</td>
                                    <td className={`p-3 text-sm text-gray-700 `}>
                                        <span className={`${getStatusColor(trial.status)} p-1.5 tracking-wider rounded-lg`}>{convertStatus(trial.status)}</span>
                                    </td>
                                    <td className='p-3 text-sm text-gray-700 ' >{trial?.eligibility_criteria?.slice(0,100) || 'N/A'}...</td>
                                    <td className='p-3 text-sm text-gray-700 '>{trial?.conditions?.join(', ').slice(0,150) || 'N/A'}...</td>
                                    <td className='p-3 text-sm text-gray-700 '><DotsThreeCircleIcon size={24}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className='flex justify-between items-center mt-10 p-6'>
                        <button onClick={handlePreviousPage} className='cursor-pointer hover:scale-105 transition-all duration-300 disabled:opacity-30' disabled={currentPage === 1}>
                            <ArrowCircleLeftIcon size={32}/>
                        </button>
                            
                            <p>Page {currentPage} of {totalPages}</p>

                        <button onClick={handleNextPage} className='cursor-pointer hover:scale-105 transition-all duration-300'>
                            <ArrowCircleRightIcon size={32}/>
                        </button>
                    </div>
                </div>)
                : (<div className='flex items-center justify-center min-h-[750px]'>
                    <p className=' text-lg'>No trials found. Please adjust your search criteria</p>
                </div>)
            }
        </>
    )
}

export default TrialsTable