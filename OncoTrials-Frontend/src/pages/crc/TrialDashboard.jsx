import React, { useState } from "react";
import TrialFilterForm from "./TrialFilterForm";
import TrialTable from "./TrialTable";

function TrialDashboard({ trials, trialsPerPage }) {
    const [filteredTrials, setFilteredTrials] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const dataPerPage = trialsPerPage;
    const safeTrials = Array.isArray(trials) ? trials : [];
    const activeTrials = filteredTrials !== null ? filteredTrials : safeTrials;
    const paginatedData = activeTrials.slice(
        (currentPage - 1) * dataPerPage,
        currentPage * dataPerPage
    );

    const totalPages = Math.ceil(
        activeTrials.length / dataPerPage
    );

    const handleFilter = (results) => {
        setFilteredTrials(results);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <TrialFilterForm trials={trials} onFilter={handleFilter} />
            <TrialTable
                data={paginatedData}
                currentPage={currentPage}
                totalPages={totalPages}
                onNextPage={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                onPrevPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            />
        </div>
    );
}

export default TrialDashboard;
