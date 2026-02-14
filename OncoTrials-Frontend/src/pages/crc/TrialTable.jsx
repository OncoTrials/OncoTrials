import React from "react";
import { DotsThreeCircleIcon, ArrowCircleLeftIcon, ArrowCircleRightIcon } from "@phosphor-icons/react";

function TrialTable({ data, currentPage, totalPages, onNextPage, onPrevPage }) {
    const convertStatus = (status) => {
        if (!status) return "Unknown";
        return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "recruiting":
                return "bg-green-200 text-green-800";
            case "available":
                return "bg-green-200 text-green-800";
            case "not_yet_recruiting":
                return "bg-yellow-200 text-yellow-800";
            case "withheld":
                return "bg-red-200 text-red-800";
            case "no_longer_available":
                return "bg-red-200 text-red-800";
            case "enrolling_by_invitation":
                return "bg-blue-200 text-blue-800";
            default:
                return "bg-gray-200 text-gray-700";
        }
    };

    return (
        <>
            {data && data.length > 0 ? (
                <div className="overflow-hidden bg-white rounded-xl shadow">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="w-72 p-3 text-md font-semibold tracking-wide text-left">Title</th>
                                <th className="w-48 p-3 text-md font-semibold tracking-wide text-left">Status</th>
                                <th className="p-3 text-md font-semibold tracking-wide text-left">I/E Criteria</th>
                                <th className="w-48 p-3 text-md font-semibold tracking-wide text-left">Cancer Type</th>
                                <th className="p-3 text-md font-semibold tracking-wide text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map((trial) => (
                                <tr key={trial.id} className="hover:bg-gray-100 transition odd:bg-gray-50">
                                    <td className="p-3 text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                                        {trial.title}
                                    </td>
                                    <td className="p-3 text-sm text-gray-700">
                                        <span className={`${getStatusColor(trial.status)} p-1.5 tracking-wider rounded-lg`}>
                                            {convertStatus(trial.status)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 truncate max-w-[250px]">
                                        {trial?.eligibility_criteria?.slice(0, 80) || "N/A"}...
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 truncate max-w-[150px]">
                                        {trial?.conditions?.join(", ").slice(0, 80) || "N/A"}...
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 cursor-pointer hover:text-gray-500">
                                        <DotsThreeCircleIcon size={22} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-center mt-5 p-4">
                        <button
                            onClick={onPrevPage}
                            className="cursor-pointer hover:scale-105 transition-all duration-300 disabled:opacity-30"
                            disabled={currentPage === 1}
                        >
                            <ArrowCircleLeftIcon size={28} />
                        </button>

                        <p className="text-sm">
                            Page {currentPage} of {totalPages}
                        </p>

                        <button
                            onClick={onNextPage}
                            className="cursor-pointer hover:scale-105 transition-all duration-300"
                            disabled={currentPage === totalPages}
                        >
                            <ArrowCircleRightIcon size={28} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[300px] bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-md">No trials found. Please adjust your search criteria.</p>
                </div>
            )}
        </>
    );
}

export default TrialTable;
