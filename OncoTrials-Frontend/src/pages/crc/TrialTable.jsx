import { DotsThreeCircleIcon, ArrowCircleLeftIcon, ArrowCircleRightIcon } from "@phosphor-icons/react";

const STATUS_CONFIG = {
    recruiting: { label: "Recruiting", classes: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    available: { label: "Available", classes: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    not_yet_recruiting: { label: "Not Yet Recruiting", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    withheld: { label: "Withheld", classes: "bg-red-50 text-red-700 ring-1 ring-red-200" },
    no_longer_available: { label: "No Longer Available", classes: "bg-red-50 text-red-700 ring-1 ring-red-200" },
    enrolling_by_invitation: { label: "By Invitation", classes: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
};

function StatusBadge({ status }) {
    const key = status?.toLowerCase();
    const config = STATUS_CONFIG[key];
    const label = config?.label ?? (status?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown");
    const classes = config?.classes ?? "bg-gray-100 text-gray-600 ring-1 ring-gray-200";

    return (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${classes}`}>
            {label}
        </span>
    );
}

function TrialTable({ data, currentPage, totalPages, onNextPage, onPrevPage }) {
    // NOTE for Jeremiah: this isn't being used, delete?
    const convertStatus = (status) => {
        if (!status) return "Unknown";
        return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
                                        <StatusBadge status={trial.status} />
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
