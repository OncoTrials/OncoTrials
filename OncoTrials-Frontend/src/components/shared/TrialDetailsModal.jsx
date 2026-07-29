import React from 'react';
import {
    convertStatus,
    getStatusColor,
    getStatusDot,
    getMatchStyle,
} from '../../utils/TrialCardUtils';

// `modalData` is the partial (list-column) data that opened the modal.
// `displayData` is fullModalData ?? modalData — the merged view once the
// detail fetch resolves. Both are passed down rather than recomputed here
// so the parent stays the single source of truth for the fetch lifecycle.
function TrialDetailsModal({
    modalData,
    displayData,
    modalDetailLoading,
    selectedLocation,
    setSelectedLocation,
    closeModal,
}) {
    if (!modalData) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={closeModal}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Accent bar — colored by eligibility match when available */}
                <div className={`h-2 w-full shrink-0 ${getMatchStyle(modalData.match).bar}`} />

                {/* Scrollable body */}
                <div className="overflow-y-auto p-6 space-y-5">
                    {/* Title */}
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                        {modalData.title}
                    </h2>

                    {/* Eligibility match panel — only shown after a search */}
                    {modalData.match && (() => {
                        const style = getMatchStyle(modalData.match);
                        const { met_inclusion, failed_inclusion, triggered_exclusion, missing_information } = modalData.match.reasons;
                        return (
                            <div className={`rounded-xl border p-4 space-y-3 ${style.badge}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">Eligibility Match</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.badge}`}>{style.text}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-xs text-gray-900">
                                    {met_inclusion.length > 0 && (
                                        <div>
                                            <p className="font-medium text-black-700 mb-1">Criteria met</p>
                                            <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                {met_inclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {failed_inclusion.length > 0 && (
                                        <div>
                                            <p className="font-medium text-black-700 mb-1">Criteria not met</p>
                                            <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                {failed_inclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {triggered_exclusion.length > 0 && (
                                        <div>
                                            <p className="font-medium text-red-700 mb-1">Exclusion criteria triggered</p>
                                            <ul className="list-disc pl-4 space-y-0.5 text-black-800">
                                                {triggered_exclusion.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {missing_information.length > 0 && (
                                        <div>
                                            <p className="font-medium text-gray-600 mb-1">Missing information</p>
                                            <ul className="list-disc pl-4 space-y-0.5 text-black-600">
                                                {missing_information.map((reason, idx) => <li key={idx}>{reason}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Overview grid — uses displayData */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit ${getStatusColor(displayData?.status)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(displayData?.status)}`} />
                                {convertStatus(displayData?.status)}
                            </span>
                        </div>
                        {displayData?.sex && (
                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sex</span>
                                <span className="text-sm text-gray-800 font-medium">{displayData.sex}</span>
                            </div>
                        )}
                        {displayData?.minimum_age && (
                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Minimum Age</span>
                                <span className="text-sm text-gray-800 font-medium">{displayData.minimum_age}</span>
                            </div>
                        )}
                        {displayData?.start_date && (
                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</span>
                                <span className="text-sm text-gray-800 font-medium">{displayData.start_date}</span>
                            </div>
                        )}
                        {displayData?.primary_completion_date && (
                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Primary Completion Date</span>
                                <span className="text-sm text-gray-800 font-medium">{displayData.primary_completion_date}</span>
                            </div>
                        )}
                        {displayData?.completion_date && (
                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completion Date</span>
                                <span className="text-sm text-gray-800 font-medium">{displayData.completion_date}</span>
                            </div>
                        )}
                    </div>

                    {/* Conditions — available from list columns */}
                    {displayData?.conditions?.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-500">Conditions</span>
                            <div className="flex flex-wrap gap-2">
                                {displayData.conditions.map((condition, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-xs font-medium">{condition}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Study Description — heavy field, show skeleton until fullModalData arrives */}
                    {(modalDetailLoading || displayData?.study_description || displayData?.summary) ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Study Description</span>
                            {modalDetailLoading ? (
                                <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                            ) : (
                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                    {displayData.study_description || displayData.summary}
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* Eligibility Criteria Summary — only render when loading or data present */}
                    {(modalDetailLoading || displayData?.eligibility_criteria_summary) && (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-500">Eligibility Criteria Summary</span>
                            {modalDetailLoading ? (
                                <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                            ) : (
                                <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-3">
                                    {displayData.eligibility_criteria_summary
                                        .split('##')
                                        .filter(Boolean)
                                        .map((section, index) => {
                                            const [title, ...lines] = section.trim().split('\n');
                                            return (
                                                <div key={index}>
                                                    <h4 className="font-semibold text-gray-900 mb-1">{title.replace(/-/g, '').trim()}</h4>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {lines.filter(line => line.trim().startsWith('-')).map((line, lineIdx) => (
                                                            <li key={lineIdx}>{line.replace('-', '').trim()}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Eligibility Criteria (structured) — only render when loading or data present */}
                    {(modalDetailLoading || displayData?.eligibility_summary_clinician_json) && (
                        <div className="flex flex-col gap-3">
                            <span className="text-sm font-medium text-gray-500">Eligibility Criteria</span>
                            {modalDetailLoading ? (
                                <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                            ) : displayData?.eligibility_summary_clinician_json ? (
                                <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-4 text-sm text-gray-700">
                                    {displayData.eligibility_summary_clinician_json.inclusion_criteria?.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-green-700 mb-1">Inclusion Criteria</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {displayData.eligibility_summary_clinician_json.inclusion_criteria.map((item, index) => (
                                                    <li key={index}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {displayData.eligibility_summary_clinician_json.exclusion_criteria?.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-red-700 mb-1">Exclusion Criteria</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {displayData.eligibility_summary_clinician_json.exclusion_criteria.map((item, index) => (
                                                    <li key={index}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Locations — only render when loading or data present */}
                    {(modalDetailLoading || displayData?.locations?.length > 0) && (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-500">
                                {displayData?.locations?.length > 0
                                    ? <>Locations <span className="text-gray-400 font-normal">({displayData.locations.length})</span></>
                                    : 'Locations'}
                            </span>
                            {modalDetailLoading ? (
                                <div className="animate-pulse bg-gray-100 rounded-xl h-20" />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                                        {displayData.locations.map((loc, locIdx) => (
                                            <div
                                                key={locIdx}
                                                onClick={() => setSelectedLocation(loc)}
                                                className={`flex items-start justify-between gap-3 rounded-xl p-3 cursor-pointer transition-colors ${selectedLocation === loc ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white border border-gray-100 shadow-sm hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <span className="text-sm font-semibold text-gray-800 truncate">{loc.facility}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                                                        {loc.zip ? ` ${loc.zip}` : ''}
                                                    </span>
                                                </div>
                                                {loc.status && (
                                                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${loc.status.toUpperCase() === 'RECRUITING' ? 'bg-green-100 text-green-700'
                                                            : loc.status.toUpperCase() === 'COMPLETED' ? 'bg-gray-100 text-gray-600'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {loc.status.charAt(0).toUpperCase() + loc.status.slice(1).toLowerCase()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Google Maps embed for selected location */}
                                    {selectedLocation && (() => {
                                        const query = [selectedLocation.facility, selectedLocation.city, selectedLocation.state, selectedLocation.country, selectedLocation.zip]
                                            .filter(Boolean).join('+').replace(/\s+/g, '+');
                                        return (
                                            <div className="rounded-xl overflow-hidden border border-gray-200">
                                                <iframe
                                                    width="100%" height="220"
                                                    style={{ border: 0, display: 'block' }}
                                                    loading="lazy" allowFullScreen
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_API_KEY}&q=${encodeURIComponent(query)}`}
                                                />
                                                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                                                    {selectedLocation.facility} — {[selectedLocation.city, selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ')}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
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
    );
}

export default TrialDetailsModal;