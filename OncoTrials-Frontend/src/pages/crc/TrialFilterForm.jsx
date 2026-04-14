import React, { useState } from "react";
import FormButton from "../../components/buttons/FormButton";

function TrialFilterForm({ trials, onFilter }) {
    const [filters, setFilters] = useState({
        gender: "",
        age: "",
        trialStatus: "",
        cancerType: "",
        biomarker: "",
    });

    const handleChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        const results = trials.filter((trial) => {
            const genderMatch =
                !filters.gender ||
                filters.gender === "all" ||
                trial.sex?.toLowerCase() === filters.gender.toLowerCase();

            const ageMatch = !filters.age || (() => {
                const patientAge = Number(filters.age);
                const minAge = parseInt(trial.minimum_age) || 0;
                const maxAge = parseInt(trial.maximum_age) || Infinity;
                return patientAge >= minAge && patientAge <= maxAge;
            })();

            const statusMatch =
                !filters.trialStatus ||
                trial.status?.toLowerCase() === filters.trialStatus.toLowerCase();

            const cancerTypeMatch =
                !filters.cancerType ||
                trial.conditions?.some((cond) =>
                    cond.toLowerCase().includes(filters.cancerType.toLowerCase())
                );

            const biomarkerMatch =
                !filters.biomarker ||
                trial.biomarker_criteria?.toLowerCase().includes(filters.biomarker.toLowerCase());

            console.log(genderMatch,ageMatch,statusMatch,cancerTypeMatch,biomarkerMatch );

            return genderMatch && ageMatch && statusMatch && cancerTypeMatch && biomarkerMatch;
        });

        onFilter(results);
    };

    const handleReset = () => {
        setFilters({
            gender: "",
            age: "",
            trialStatus: "",
            cancerType: "",
            biomarker: "",
        });
        onFilter(trials);
    };

    return (
        <div className="flex flex-wrap gap-4 bg-white p-6 rounded-lg shadow-sm">
            {/* Gender */}
            <div className="flex flex-col w-56">
                <label className="text-gray-700 text-sm font-semibold mb-1">Gender</label>
                <select
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:outline-blue-300"
                    value={filters.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                >
                    <option value="">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="all">Prefer not to say</option>
                </select>
            </div>

            {/* Age */}
            <div className="flex flex-col w-40">
                <label className="text-gray-700 text-sm font-semibold mb-1">Age</label>
                <input
                    type="number"
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:outline-blue-300"
                    placeholder="Enter age"
                    value={filters.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                />
            </div>

            {/* Trial Status */}
            <div className="flex flex-col w-56">
                <label className="text-gray-700 text-sm font-semibold mb-1">Trial Status</label>
                <select
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:outline-blue-300"
                    value={filters.trialStatus}
                    onChange={(e) => handleChange("trialStatus", e.target.value)}
                >
                    <option value="">All</option>
                    <option value="recruiting">Recruiting</option>
                    <option value="not_yet_recruiting">Not Yet Recruiting</option>
                    <option value="active_not_recruiting">Active Not Recruiting</option>
                </select>
            </div>

            {/* Cancer Type */}
            <div className="flex flex-col w-56">
                <label className="text-gray-700 text-sm font-semibold mb-1">Cancer Type</label>
                <input
                    type="text"
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:outline-blue-300"
                    placeholder="Enter cancer type"
                    value={filters.cancerType}
                    onChange={(e) => handleChange("cancerType", e.target.value)}
                />
            </div>

            {/* Biomarker */}
            <div className="flex flex-col flex-1 min-w-[250px]">
                <label className="text-gray-700 text-sm font-semibold mb-1">Mutation / Biomarker</label>
                <input
                    type="text"
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:outline-blue-300"
                    placeholder="e.g. EGFR, KRAS"
                    value={filters.biomarker}
                    onChange={(e) => handleChange("biomarker", e.target.value)}
                />
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-3">
                <FormButton text="Search" onClick={handleSearch} />
                <FormButton text="Reset" onClick={handleReset} />
            </div>
        </div>
    );
}

export default TrialFilterForm;
