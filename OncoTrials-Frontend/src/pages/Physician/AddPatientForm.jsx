import React, { useState } from 'react'
import { InfoIcon } from '@phosphor-icons/react'
import FormButton from '../../components/buttons/FormButton'

function AddPatientForm({ trials, onFilter }) {
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [trialStatus, setTrialStatus] = useState('');
    const [cancerType, setCancerType] = useState('');
    const [biomarker, setBioMarker] = useState('');
    // console.log(gender, age, trialStatus, cancerType, biomarker);

    const convertToYear = (date) => {
        if(date[1] && date[1] === 'Months' || date[1] === 'Years' || date[1] === 'Weeks' || date[1] === 'Hours'){
            return date[0] / 365
        }
        // console.log(date[1]);
    }


    const handleSearch = () => {
        const results = trials.filter(trial => {
            // --- Gender ---
            const genderMatch =
                !gender ||
                gender === 'all' ||
                trial.sex?.toLowerCase() === 'all' ||
                trial.sex?.toLowerCase() === gender.toLowerCase()

            // --- Age ---
            let ageMatch = true
            let te = null
            if (age) {
                if (trial.minimum_age) {
                    // console.log(trial.minimum_age.split(" "));
                    te = convertToYear(trial.minimum_age.split(" "));
                    console.log(test);
                }
                
                const trialMinAge = parseInt(trial.minimum_age) || 0 // e.g., "18 Years"
                ageMatch = Number(age) >= te
            }

            // --- Status ---
            const statusMatch =
                !trialStatus || trialStatus === '' ||
                trial.status?.toLowerCase() === trialStatus.toLowerCase()

            // --- Cancer Type ---
            const searchCondition = cancerType?.toLowerCase();
            const cancerTypeMatch =
                !searchCondition ||
                (Array.isArray(trial.conditions)) &&
                trial.conditions?.some(cond =>
                    cond.toLowerCase().includes(searchCondition)
                )

            // --- Biomarker ---
            const searchBiomarker = biomarker?.toLowerCase();
            const biomarkerMatch =
                !searchBiomarker || !trial.biomarker_criteria ||
                (trial.biomarker_criteria &&
                    trial.biomarker_criteria
                        .toLowerCase()
                        .includes(searchBiomarker))
            
            // if (genderMatch === false){
            //     console.log({
                
            //         trial: trial.title,
            //         genderMatch,
            //         ageMatch,
            //         statusMatch,
            //         cancerTypeMatch,
            //         biomarkerMatch
            //     })
            // }

            return (
                genderMatch &&
                ageMatch &&
                statusMatch &&
                cancerTypeMatch &&
                biomarkerMatch
            )
        })

        onFilter(results)
    }

    // console.log(filteredTrials);

    const handleReset = () => {
        setGender('');
        setAge('');
        setTrialStatus('');
        setCancerType('');
        setBioMarker('');
        onFilter([]);
    }
    return (
        <>
            {/* <div className="inline-flex items-center justify-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border-l-4 border-blue-400 mt-2">
                <InfoIcon size={16} className="text-blue-500 flex-shrink-0" />
                <p className="italic">Fields marked with <span className="text-red-500 font-semibold">*</span> are required</p>
            </div> */}
            <div className=''>

                <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-type-input">Gender</label>
                    <select
                        class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                        type="text"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        id="gender-input"
                    >
                        <option >Choose Gender</option>
                        <option value={'male'}>Male</option>
                        <option value={'female'}>Female</option>
                        <option value={'all'}>Prefer Not to Say</option>
                    </select>
                </div>

                <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="diagnosis-input">Age</label>
                    <input
                        class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                        placeholder="Enter age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        id="age-input"
                    />
                </div>
                <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-type-input">Trial Status</label>
                    <select
                        class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                        type="text"
                        value={trialStatus}
                        onChange={(e) => setTrialStatus(e.target.value)}
                        id="trial-status-input"
                    >
                        <option value={''}>Choose Trial Status</option>
                        <option value={'recruiting'}>Recruiting</option>
                        <option value={'not-yet-recruiting'}>Not Yet Recruiting</option>
                        <option value={'active-not-recruiting'}>Active Not Recruiting</option>
                        <option value={'enrolling-by-invitation'}>Enrolling By Invitation</option>
                    </select>
                </div>
                <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-type-input">Cancer Type</label>
                    <input
                        class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                        placeholder="Enter cancer type"
                        type="text"
                        value={cancerType}
                        onChange={(e) => setCancerType(e.target.value)}
                        id="cancer-type-input"
                    />
                </div>
                <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                    <label class="block text-gray-700 text-sm font-bold mb-2" for="mutation-biomarker-input">Mutation or BioMarker (e.g., EGFR, KRAS)</label>
                    <textarea
                        class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                        placeholder="Enter mutation/biomarker"
                        type="text"
                        value={biomarker}
                        onChange={(e) => setBioMarker(e.target.value)}
                        id="mutation-biomarker-input"
                        rows={5}
                    />
                </div>
                <div className='flex flex-row items-center justify-center space-x-5'>
                    <FormButton text={'Search Trials'} onClick={handleSearch} />
                    <FormButton text={'Reset'} onClick={handleReset} />
                </div>
            </div>
        </>
    )
}

export default AddPatientForm