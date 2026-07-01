import React from 'react';
import ViewDetailsButtons from '../buttons/ViewDetailsButtons';
import { PencilIcon } from '@phosphor-icons/react';
import {
    convertStatus,
    getStatusColor,
    getStatusDot,
    formatDate,
    getMatchStyle,
    cleanEligibilitySummary,
} from '../../utils/TrialCardUtils';

function TrialCard({ trial, organizationName, onOpenDetails, onOpenEdit }) {
    return (
        <div
            onClick={(event) => onOpenDetails(trial, event)}
            className="relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100
            hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5
            transition-all duration-200 cursor-pointer overflow-hidden"
        >
            {/* Top accent bar — colored by eligibility match when available */}
            <div className={`h-1.5 w-full shrink-0 ${getMatchStyle(trial.match).bar}`} />

            <div className="flex flex-col flex-1 p-5 gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
                        {trial.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {trial.match && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getMatchStyle(trial.match).badge}`}>
                                {getMatchStyle(trial.match).text}
                            </span>
                        )}
                        {trial.completion_date && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                                Ends {formatDate(trial.completion_date)}
                            </span>
                        )}
                        {trial.organization === organizationName && (
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <button
                                    type="button"
                                    aria-label="Edit trial"
                                    onClick={(e) => onOpenEdit(trial, e)}
                                    className="p-1.5 rounded-full text-sky-500 hover:text-sky-700 hover:bg-sky-50
                                    focus:outline-none focus:ring-2 focus:ring-sky-200 cursor-pointer transition-colors"
                                >
                                    <PencilIcon size={16} weight="bold" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Snippet */}
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                    {cleanEligibilitySummary((trial?.eligibility_criteria_summary || trial?.summary)?.slice(0, 140))}
                    {(trial?.eligibility_criteria_summary || trial?.summary)?.length > 140 ? '…' : ''}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium tracking-wide ${getStatusColor(trial.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(trial.status)}`} />
                        {convertStatus(trial.status)}
                    </span>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ViewDetailsButtons onClick={(e) => onOpenDetails(trial, e)} Text="View Details" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TrialCard;