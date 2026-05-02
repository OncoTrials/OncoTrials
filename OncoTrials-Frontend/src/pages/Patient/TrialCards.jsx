import React, { useState } from 'react';
import ViewDetailsButtons from '../../components/buttons/ViewDetailsButtons';

function TrialCards({ trials }) {
    const [modalData, setModalData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLocation, setSelectedLocation] = useState(
        modalData?.locations?.[0] ?? null
    );

    const trialsPerPage = 12;
    const totalPages = Math.ceil(trials?.length / trialsPerPage);
    const startIndex = (currentPage - 1) * trialsPerPage;
    const paginatedData = trials?.slice(startIndex, startIndex + trialsPerPage);

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const convertStatus = (status) => {
        if (!status) return 'Unavailable';
        switch (status.toLowerCase()) {
            case 'recruiting': return 'Recruiting';
            case 'not_yet_recruiting': return 'Not Yet Recruiting';
            case 'active_not_recruiting': return 'Active Not Recruiting';
            case 'enrolling_by_invitation': return 'Enrolling By Invitation';
            default: return 'Unavailable';
        }
    };

    const getStatusColor = (status) => {
        if (!status) return 'bg-red-100 text-red-700';
        switch (status.toLowerCase()) {
            case 'recruiting': return 'bg-green-100 text-green-700';
            case 'not_yet_recruiting': return 'bg-yellow-100 text-yellow-700';
            case 'active_not_recruiting': return 'bg-gray-100 text-gray-600';
            case 'enrolling_by_invitation': return 'bg-blue-100 text-blue-700';
            default: return 'bg-red-100 text-red-700';
        }
    };

    const getEligibilityColor = (eligibility) => {
        if (!eligibility) return 'bg-red-100 text-red-700';
        switch (eligibility.toLowerCase()) {
            case 'eligible': return 'bg-green-100 text-green-700';
            case 'likely_eligible': return 'bg-yellow-100 text-yellow-700';
            case 'needs_review': return 'bg-gray-100 text-gray-600';
            default: return 'bg-red-100 text-red-700';
        }
    };

    const convertEligibility = (eligibility) => {
        if (!eligibility) return '';
        switch (eligibility.toLowerCase()) {
            case 'eligible': return 'Eligible';
            case 'likely_eligible': return 'Likely Eligible';
            case 'needs_review': return 'Needs Review';
            case 'not_eligible': return 'Not Eligible'
        }
    };

    const getStatusDot = (status) => {
        if (!status) return 'bg-red-400';
        switch (status.toLowerCase()) {
            case 'recruiting': return 'bg-green-500 animate-pulse';
            case 'not_yet_recruiting': return 'bg-yellow-500';
            case 'active_not_recruiting': return 'bg-gray-400';
            case 'enrolling_by_invitation': return 'bg-blue-500 animate-pulse';
            default: return 'bg-red-400';
        }
    };

    const getMatchBadgeColor = (pct) => {
        if (pct >= 90) return 'bg-green-100 text-green-700 border border-green-200';
        if (pct >= 50) return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        return 'bg-red-100 text-red-700 border border-red-200';
    };

    const formatDate = (date) => {
        if (!date) return null;
    
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });
    };

    const openModal = (trial) => setModalData(trial);
    const closeModal = () => setModalData(null);

    const cleanEligibilitySummary = (summary) => {
        if (!summary) return '';

        return summary
            .replace(/##\s*/g, '')  // remove "##" and any trailing space
            .trim();
    };


    const renderList = (items) => {
        if (!items || items.length === 0) {
            return <p className="text-sm text-black">None</p>;
        }

        return (
            <ul className="list-disc pl-5 text-sm text-black">
                {items.map((item, index) => (
                    <li key={index} className="mb-1">
                        {item}
                    </li>
                ))}
            </ul>
        );
    };

    if (!trials || trials?.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[750px]">
                <p className="text-lg text-gray-500">No trials found. Please adjust your search criteria.</p>
            </div>
        );
    }


    return (
        <>
            {/* Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 min-h-[550px] content-start">
                {paginatedData.map((trial) => (
                    <div
                        key={trial.id}
                        onClick={() => openModal(trial)}
                        className="
                            relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100
                            hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5
                            transition-all duration-200 cursor-pointer overflow-hidden
                        "
                    >
                        {/* Top accent bar — colour reflects match % */}
                        <div
                            className={`h-1.5 w-full ${trial.match?.status === 'eligible'
                                ? 'bg-green-400'
                                : trial.match?.score === 'likely_eligible'
                                    ? 'bg-yellow-400' : trial.match?.status === 'not_eligible' ? 'bg-red-400'
                                        : 'bg-gray-400'
                                }`}
                        />

                        <div className="flex flex-col flex-1 p-5 gap-4">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
                                    {trial.title}
                                </h3>

                                {/* Match badge */}
                                {/* {trial.match?.score && (<span
                                    className={`
                                        shrink-0 inline-flex items-center px-2.5 py-0.5
                                        rounded-full text-xs font-bold tracking-wide
                                        ${getMatchBadgeColor(trial.match?.score)}
                                    `}
                                >
                                    {trial.match?.score}%
                                </span>)} */}
                                {trial.match?.score && (<span
                                    className={`
                                        shrink-0 inline-flex items-center px-2.5 py-0.5
                                        rounded-full text-xs font-bold tracking-wide
                                        ${getEligibilityColor(trial.match?.status)}
                                    `}
                                >
                                    {convertEligibility(trial.match?.status)}
                                </span>)}

                                {/* Completion date pill */}
                                {trial.completion_date && (
                                    <span
                                        className="
          shrink-0 inline-flex items-center px-2.5 py-0.5
          rounded-full text-[10px] font-medium tracking-wide
          bg-gray-100 text-gray-600 border border-gray-200
        "
                                    >
                                        Ends {formatDate(trial.completion_date)}
                                    </span>
                                )}
                            </div>

                            {/* Eligibility criteria snippet */}
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                                {cleanEligibilitySummary(trial?.eligibility_criteria_summary?.slice(0, 140))}
                                {trial?.eligibility_criteria_summary?.length > 140 ? '…' : ''}
                            </p>

                            {/* Footer row */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                {/* Status pill */}
                                <span
                                    className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1
                                        rounded-lg text-xs font-medium tracking-wide
                                        ${getStatusColor(trial.status)}
                                    `}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(trial.status)}`} />
                                    {convertStatus(trial.status)}
                                </span>

                                {/* Action button */}
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ViewDetailsButtons
                                        onClick={() => openModal(trial)}
                                        Text="View Details"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modalData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Accent bar */}
                        <div className={`h-2 w-full shrink-0 ${modalData.match?.status === 'eligible' ? 'bg-green-400'
                            : modalData.match?.status === 'likely_eligible' ? 'bg-yellow-400'
                                : 'bg-gray-400'
                            }`} />

                        {/* Scrollable body */}
                        <div className="overflow-y-auto p-6 space-y-5">

                            {/* Title + match badge */}
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="text-lg font-semibold text-gray-900 leading-snug flex-1">
                                    {modalData.title}
                                </h2>
                                {modalData.match?.status && (<span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold tracking-wide ${getEligibilityColor(modalData.match?.status)}`}>
                                    {convertEligibility(modalData.match?.status)}
                                </span>)}
                            </div>

                            {/* ── Overview grid ── */}
                            <div className="grid grid-cols-2 gap-3">

                                {/* Status */}
                                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit ${getStatusColor(modalData.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(modalData.status)}`} />
                                        {convertStatus(modalData.status)}
                                    </span>
                                </div>

                                {/* Sex */}
                                {modalData.sex && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sex</span>
                                        <span className="text-sm text-gray-800 font-medium">{modalData.sex}</span>
                                    </div>
                                )}

                                {/* Minimum Age */}
                                {modalData.minimum_age && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Minimum Age</span>
                                        <span className="text-sm text-gray-800 font-medium">{modalData.minimum_age}</span>
                                    </div>
                                )}

                                {/* Start Date */}
                                {modalData.start_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{modalData.start_date}</span>
                                    </div>
                                )}

                                {/* Primary Completion Date */}
                                {modalData.start_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Primary Completion Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{modalData.primary_completion_date}</span>
                                    </div>
                                )}

                                {/* Completion Date */}
                                {modalData.completion_date && (
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completion Date</span>
                                        <span className="text-sm text-gray-800 font-medium">{modalData.completion_date}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Conditions ── */}
                            {modalData.conditions?.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">Conditions</span>
                                    <div className="flex flex-wrap gap-2">
                                        {modalData.conditions.map((c, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-xs font-medium">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {modalData.match?.reasons && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-500">Reasons for Trial Score</span>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                                        <h4 className="text-lg font-semibold mt-4">Met Inclusion</h4>
                                        {renderList(modalData.match?.reasons.met_inclusion)}

                                        <h4 className="text-lg font-semibold mt-4">Failed Inclusion</h4>
                                        {renderList(modalData.match?.reasons.failed_inclusion)}

                                        <h4 className="text-lg font-semibold mt-4">Triggered Inclusion</h4>
                                        {renderList(modalData.match?.reasons.triggered_inclusion)}

                                        <h4 className="text-lg font-semibold mt-4">Missing Information</h4>
                                        {renderList(modalData.match?.reasons.missing_information)}

                                        <h4 className="text-lg font-semibold mt-4">Notes</h4>
                                        {renderList(modalData.match?.reasons.notes)}
                                    </p>
                                </div>
                            )}

                            {/* ── Study Description ── */}
                            {modalData.study_description && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-500">Study Description</span>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                                        {modalData.study_description}
                                    </p>
                                </div>
                            )}

                            {/* ── Eligibility Criteria Summary ── */}
                            {modalData.eligibility_criteria_summary && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                        Eligibility Criteria Summary
                                    </span>

                                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-3">
                                        {modalData.eligibility_criteria_summary
                                            .split('##')
                                            .filter(Boolean)
                                            .map((section, index) => {
                                                const [title, ...lines] = section.trim().split('\n');

                                                return (
                                                    <div key={index}>
                                                        <h4 className="font-semibold text-gray-900 mb-1">
                                                            {title.replace(/-/g, '').trim()}
                                                        </h4>
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            {lines
                                                                .filter(line => line.trim().startsWith('-'))
                                                                .map((line, i) => (
                                                                    <li key={i}>
                                                                        {line.replace('-', '').trim()}
                                                                    </li>
                                                                ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* ── Eligibility Criteria ── */}
                            {modalData.eligibility_summary_clinician_json && (
                                <div className="flex flex-col gap-3">
                                    <span className="text-sm font-medium text-gray-500">
                                        Eligibility Criteria
                                    </span>

                                    <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-4 text-sm text-gray-700">

                                        {/* Inclusion */}
                                        {modalData.eligibility_summary_clinician_json.inclusion_criteria?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-green-700 mb-1">
                                                    Inclusion Criteria
                                                </h4>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {modalData.eligibility_summary_clinician_json.inclusion_criteria.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Exclusion */}
                                        {modalData.eligibility_summary_clinician_json.exclusion_criteria?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-red-700 mb-1">
                                                    Exclusion Criteria
                                                </h4>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {modalData.eligibility_summary_clinician_json.exclusion_criteria.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            )}

                            {/* ── Locations ── */}
                            {modalData.locations?.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                        Locations{" "}
                                        <span className="text-gray-400 font-normal">
                                            ({modalData.locations.length})
                                        </span>
                                    </span>

                                    <div className="flex flex-col gap-2">
                                        {/* Scrollable location list */}
                                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                                            {modalData.locations.map((loc, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setSelectedLocation(loc)}
                                                    className={`flex items-start justify-between gap-3 rounded-xl p-3 cursor-pointer transition-colors ${selectedLocation === loc
                                                        ? "bg-blue-50 ring-1 ring-blue-200"
                                                        : "bg-gray-50 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                        <span className="text-sm font-semibold text-gray-800 truncate">
                                                            {loc.facility}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {[loc.city, loc.state, loc.country].filter(Boolean).join(", ")}
                                                            {loc.zip ? ` ${loc.zip}` : ""}
                                                        </span>
                                                    </div>
                                                    {loc.status && (
                                                        <span
                                                            className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${loc.status === "RECRUITING"
                                                                ? "bg-green-100 text-green-700"
                                                                : loc.status === "COMPLETED"
                                                                    ? "bg-gray-100 text-gray-600"
                                                                    : "bg-yellow-100 text-yellow-700"
                                                                }`}
                                                        >
                                                            {loc.status.charAt(0) + loc.status.slice(1).toLowerCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Google Maps embed for selected location */}
                                        {selectedLocation && (() => {
                                            const query = [
                                                selectedLocation.facility,
                                                selectedLocation.city,
                                                selectedLocation.state,
                                                selectedLocation.country,
                                                selectedLocation.zip,
                                            ]
                                                .filter(Boolean)
                                                .join("+")
                                                .replace(/\s+/g, "+");

                                            return (
                                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                                    <iframe
                                                        width="100%"
                                                        height="220"
                                                        style={{ border: 0, display: "block" }}
                                                        loading="lazy"
                                                        allowFullScreen
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_API_KEY}&q=${query}`}
                                                    />
                                                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                                                        📍 {selectedLocation.facility} —{" "}
                                                        {[selectedLocation.city, selectedLocation.state, selectedLocation.country]
                                                            .filter(Boolean)
                                                            .join(", ")}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky footer */}
                        <div className="shrink-0 flex justify-end px-6 py-4 border-t border-gray-100 bg-white">
                            <button
                                onClick={closeModal}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <button
                    type="button"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="
                        bg-white text-center w-28 rounded-2xl h-11 relative
                        text-black text-md font-semibold group outline
                        disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed
                    "
                >
                    <div className="bg-green-400 rounded-xl h-9 w-6 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[105px] group-disabled:w-6 z-10 duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" height="25px" width="25px">
                            <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="#000000" />
                            <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="#000000" />
                        </svg>
                    </div>
                    <p className="translate-x-3">Previous</p>
                </button>

                <span className="text-sm text-gray-600">
                    {paginatedData.length === 0 ? 'No Pages' : `Page ${currentPage} of ${totalPages}`}
                </span>

                <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="
                        bg-white text-center w-28 rounded-2xl h-11 relative
                        text-black text-md font-semibold group outline
                        disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed
                    "
                >
                    <div className="bg-green-400 rounded-xl h-9 w-6 flex items-center justify-center absolute right-1 top-[4px] group-hover:w-[105px] group-disabled:w-6 z-10 duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6">
                            <rect width="256" height="256" fill="none" />
                            <line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                            <polyline points="144 56 216 128 144 200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                        </svg>
                    </div>
                    <p className="translate-x-[-10]">Next</p>
                </button>
            </div>
        </>
    );
}

export default TrialCards;