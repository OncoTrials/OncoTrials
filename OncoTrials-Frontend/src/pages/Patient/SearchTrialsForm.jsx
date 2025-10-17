import React, { useState } from 'react'
import FormButton from '../../components/buttons/FormButton'
import { InfoIcon } from '@phosphor-icons/react'

function SearchTrialsForm({ trials, onFilter }) {
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [trialStatus, setTrialStatus] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [cancerStage, setCancerStage] = useState('');
    const [cancerType, setCancerType] = useState('');
    const [mutationBiomarker, setMutationBiomarker] = useState('');

    const handleSearch = () => {
        const results = trials.filter(trial => {
            // --- Gender ---
            const genderMatch =
                !gender ||
                gender === 'all' ||
                trial.sex?.toLowerCase() === gender.toLowerCase()

            // --- Age ---
            let ageMatch = true
            if (age) {
                const trialMinAge = parseInt(trial.minimum_age) || 0 // e.g., "18 Years"
                ageMatch = Number(age) >= trialMinAge
            }

            // --- Status ---
            const statusMatch =
                !trialStatus || trialStatus === '' ||
                trial.status?.toLowerCase() === trialStatus.toLowerCase()

            // --- Diagnosis ---
            const diagnosisMatch =
                !diagnosis ||
                trial.conditions?.some(cond =>
                    cond.toLowerCase().includes(diagnosis.toLowerCase())
                )

            // --- Cancer Type ---
            const cancerTypeMatch =
                !cancerType ||
                trial.conditions?.some(cond =>
                    cond.toLowerCase().includes(cancerType.toLowerCase())
                )

            // --- Biomarker ---
            const biomarkerMatch =
                !mutationBiomarker || !trial.biomarker_criteria ||
                (trial.biomarker_criteria &&
                    trial.biomarker_criteria
                        .toLowerCase()
                        .includes(mutationBiomarker.toLowerCase()))

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
                diagnosisMatch &&
                statusMatch &&
                cancerTypeMatch &&
                biomarkerMatch
            )
        })

        onFilter(results)
    }

    const handleReset = () => {
        setGender('');
        setAge('');
        setTrialStatus('');
        setDiagnosis('');
        setCancerStage('');
        setCancerType('');
        setMutationBiomarker('');
        onFilter([]);
    }
    return (
        <>
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border-l-4 border-blue-400 mt-2">
                <InfoIcon size={16} className="text-blue-500 flex-shrink-0" />
                <p className="italic">Fields marked with <span className="text-red-500 font-semibold">*</span> are required</p>
            </div>

            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
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

            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
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
            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
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
            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="diagnosis-input">Diagnosis<span className='text-red-500'>*</span></label>
                <input
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter diagnosis here"
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    id="diagnosis-input"
                />
            </div>
            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-stage-input">Stage</label>
                <select
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    type="text"
                    value={cancerStage}
                    onChange={(e) => setCancerStage(e.target.value)}
                    id="cancer-stage-input"
                >
                    <option value="" disabled selected>Select Stage</option>
                    <option value="stage_1"> Stage I</option>
                    <option value="stage_2" >Stage II</option>
                    <option value="stage_3" >Stage III</option>
                    <option value="stage_4" >Stage IV</option>
                </select>
            </div>
            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-type-input">Cancer Type<span className='text-red-500'>*</span></label>
                <input
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter text here"
                    type="text"
                    value={cancerType}
                    onChange={(e) => setCancerType(e.target.value)}
                    id="cancer-type-input"
                />
            </div>
            <div class="w-full max-w-xs p-3 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="mutation-biomarker-input">Mutation or BioMarker (e.g., EGFR, KRAS)<span className='text-red-500'>*</span></label>
                <textarea
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter text here"
                    type="text"
                    value={mutationBiomarker}
                    onChange={(e) => setMutationBiomarker(e.target.value)}
                    id="mutation-biomarker-input"
                    rows={5}
                />
            </div>
            <div className='flex flex-row font-sm md:font-md items-center justify-center space-x-5'>
                <FormButton text={'Search Trials'} onClick={handleSearch} />
                <FormButton text={'Reset'} onClick={handleReset} />
            </div>
        </>
    )
}

export default SearchTrialsForm