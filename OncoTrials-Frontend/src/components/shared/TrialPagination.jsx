import React from 'react';

function TrialPagination({ currentPage, totalPages, pageInput, setPageInput, paginatedLength, onPrevious, onNext, onCommitPage }) {
    return (
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 gap-2">
            <button
                type="button"
                onClick={onPrevious}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl
                    bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-semibold
                    hover:bg-sky-500 hover:border-sky-500 hover:text-white hover:shadow-md
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-50 disabled:hover:text-sky-700 disabled:hover:border-sky-200 disabled:hover:shadow-none
                    transition-all duration-200 cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">
                {paginatedLength === 0 ? (
                    <span>No results</span>
                ) : (
                    <>
                        <span>Page</span>
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onCommitPage();
                            }}
                            onBlur={onCommitPage}
                            className="w-12 sm:w-16 px-1 py-1 text-center border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none"
                        />
                        <span>of {totalPages}</span>
                    </>
                )}
            </div>

            <button
                type="button"
                onClick={onNext}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl
                    bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-semibold
                    hover:bg-sky-500 hover:border-sky-500 hover:text-white hover:shadow-md
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-50 disabled:hover:text-sky-700 disabled:hover:border-sky-200 disabled:hover:shadow-none
                    transition-all duration-200 cursor-pointer"
            >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
}

export default TrialPagination;