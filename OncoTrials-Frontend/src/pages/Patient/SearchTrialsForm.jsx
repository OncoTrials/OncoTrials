import React, { useState } from 'react'
import FormButton from '../../components/buttons/FormButton'
import { InfoIcon, WarningIcon } from '@phosphor-icons/react'
import EligibilityMatcher from '../../utils/EligibilityMatcher'

// Normalize strings for comparison: lowercase, strip hyphens/underscores/spaces
const normalize = (str) =>
    (str ?? '').toLowerCase().replace(/[-_\s]+/g, '')

function SearchTrialsForm({ trials, onFilter }) {
    const [gender, setGender] = useState('')
    const [age, setAge] = useState('')
    const [trialStatus, setTrialStatus] = useState('')
    const [diagnosis, setDiagnosis] = useState('')
    const [cancerStage, setCancerStage] = useState('')
    const [cancerType, setCancerType] = useState('')
    const [mutationBiomarker, setMutationBiomarker] = useState('');
    const [ecogScore, setEcogScore] = useState('');
    const [lineOfTreatment, setLineOfTreatment] = useState('');
    const [errors, setErrors] = useState({});
    const [resultCount, setResultCount] = useState(null)

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const next = {}
        if (!diagnosis.trim()) next.diagnosis = 'Diagnosis is required'
        if (!cancerType.trim()) next.cancerType = 'Cancer Type is required'
        if (!mutationBiomarker.trim()) next.mutationBiomarker = 'Mutation / Biomarker is required'
        if (age && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 120)) {
            next.age = 'Enter a valid age (0–120)'
        }
        setErrors(next)
        return Object.keys(next).length === 0
    }

    const buildPatientObject = () => {
        return {
            gender,
            age: age ? Number(age) : null,
            cancerType,
            mutationBiomarker,
            ecog: ecogScore,
            priorLinesOfTherapy: lineOfTreatment,
            pregnant: null,
            hasILD: null,
            hasMeasurableDisease: null,
            daysSinceLastTherapy: null,
        };
    };

    // ── Filter logic ──────────────────────────────────────────────────────────
    const handleSearch = () => {
        if (!validate()) return

        const patient = buildPatientObject()
        const numAge = age ? Number(age) : null

        const filtered = trials.filter(trial => {
            const trialGender = normalize(trial.sex)
            const selectedGender = normalize(gender)

            const genderMatch =
                !selectedGender ||
                trialGender === 'all' ||
                selectedGender === 'all' ||
                trialGender === selectedGender

            let ageMatch = true
            if (numAge !== null) {
                const rawMin = parseInt(trial.minimum_age, 10)
                const rawMax = parseInt(trial.maximum_age, 10)
                const minAge = isNaN(rawMin) ? 0 : rawMin
                const maxAge = isNaN(rawMax) ? Infinity : rawMax
                ageMatch = numAge >= minAge && numAge <= maxAge
            }

            const statusMatch =
                !trialStatus ||
                normalize(trial.status) === normalize(trialStatus)

            const conditions = trial.conditions ?? []

            const diagnosisMatch =
                !diagnosis.trim() ||
                conditions.some(condition =>
                    condition.toLowerCase().includes(diagnosis.trim().toLowerCase())
                )

            const cancerTypeMatch =
                !cancerType.trim() ||
                conditions.some(condition =>
                    condition.toLowerCase().includes(cancerType.trim().toLowerCase())
                )

            const stageMatch =
                !cancerStage ||
                (trial.stage && normalize(trial.stage) === normalize(cancerStage)) ||
                conditions.some(condition =>
                    normalize(condition).includes(normalize(cancerStage))
                ) ||
                (trial.keywords ?? []).some(keyword =>
                    normalize(keyword).includes(normalize(cancerStage))
                )

            const biomarkerMatch =
                !mutationBiomarker.trim() ||
                !trial.biomarker_criteria ||
                trial.biomarker_criteria
                    .toLowerCase()
                    .includes(mutationBiomarker.trim().toLowerCase())

            return (
                genderMatch &&
                ageMatch &&
                statusMatch &&
                diagnosisMatch &&
                cancerTypeMatch &&
                stageMatch &&
                biomarkerMatch
            )
        })

        const resultsWithMatch = filtered.map(trial => ({
            ...trial,
            match: EligibilityMatcher.evaluatePatientAgainstTrial(patient, trial),
        }))

        setResultCount(resultsWithMatch.length)
        onFilter(resultsWithMatch)
    }

    // ── Reset — restore full list, clear all state ────────────────────────────
    const handleReset = () => {
        setGender('')
        setAge('')
        setTrialStatus('')
        setDiagnosis('')
        setCancerStage('')
        setCancerType('')
        setMutationBiomarker('')
        setErrors({})
        setResultCount(null)
        onFilter(trials);
        };

    // ── Shared input class ────────────────────────────────────────────────────
    const inputCls =
        'text-sm w-full px-4 py-2 border rounded-lg shadow-sm transition duration-300 ease-in-out ' +
        'focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100'

    const fieldCls = 'w-full max-w-xs p-3 bg-white rounded-lg font-sans'
    const labelCls = 'block text-gray-700 text-sm font-bold mb-2'
    const errorCls = 'text-red-500 text-xs mt-1'

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Info banner */}
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border-l-4 border-blue-400 mt-2">
                <InfoIcon size={16} className="text-blue-500 flex-shrink-0" />
                <p className="italic">
                    Fields marked with <span className="text-red-500 font-semibold">*</span> are required
                </p>
            </div>

            {/* Gender */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="gender-input">Gender</label>
                <select
                    className={`${inputCls} border-gray-300`}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    id="gender-input"
                >
                    <option value="">Choose Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="all">Prefer Not to Say</option>
                </select>
            </div>

            {/* Age */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="age-input">Age</label>
                <input
                    className={`${inputCls} ${errors.age ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Enter age"
                    type="number"
                    min={0}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    id="age-input"
                />
                {errors.age && <p className={errorCls}>{errors.age}</p>}
            </div>

            {/* Trial Status */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="trial-status-input">Trial Status</label>
                <select
                    className={`${inputCls} border-gray-300`}
                    value={trialStatus}
                    onChange={(e) => setTrialStatus(e.target.value)}
                    id="trial-status-input"
                >
                    <option value="">Choose Trial Status</option>
                    <option value="recruiting">Recruiting</option>
                    <option value="not yet recruiting">Not Yet Recruiting</option>
                    <option value="active not recruiting">Active Not Recruiting</option>
                    <option value="enrolling by invitation">Enrolling By Invitation</option>
                </select>
            </div>

            {/* Diagnosis */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="diagnosis-input">
                    Diagnosis<span className="text-red-500">*</span>
                </label>
                <input
                    className={`${inputCls} ${errors.diagnosis ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Enter diagnosis here"
                    type="text"
                    value={diagnosis}
                    onChange={(e) => { setDiagnosis(e.target.value); setErrors(p => ({ ...p, diagnosis: undefined })) }}
                    id="diagnosis-input"
                />
                {errors.diagnosis && <p className={errorCls}>{errors.diagnosis}</p>}
            </div>

            {/* Stage */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="cancer-stage-input">Stage</label>
                <select
                    className={`${inputCls} border-gray-300`}
                    value={cancerStage}
                    onChange={(e) => setCancerStage(e.target.value)}
                    id="cancer-stage-input"
                >
                    <option value="">Select Stage</option>
                    <option value="stage i">Stage I</option>
                    <option value="stage ii">Stage II</option>
                    <option value="stage iii">Stage III</option>
                    <option value="stage iv">Stage IV</option>
                </select>
            </div>
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="cancer-stage-input">Line of Treatment</label>
                <select
                    className={`${inputCls} border-gray-300`}
                    value={lineOfTreatment}
                    onChange={(e) => setCancerStage(e.target.value)}
                    id="line-of-treatment-input"
                >
                    <option value="">Select</option>
                    <option value="first line">First Line</option>
                    <option value="second line">Second Line</option>
                    <option value="third line">Third Line</option>
                </select>
            </div>

            {/* Cancer Type */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="cancer-type-input">
                    Cancer Type<span className="text-red-500">*</span>
                </label>
                <input
                    className={`${inputCls} ${errors.cancerType ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="e.g. Lung, Breast, Colorectal"
                    type="text"
                    value={cancerType}
                    onChange={(e) => { setCancerType(e.target.value); setErrors(p => ({ ...p, cancerType: undefined })) }}
                    id="cancer-type-input"
                />
                {errors.cancerType && <p className={errorCls}>{errors.cancerType}</p>}
            </div>

            <div className={fieldCls}>
                <label className={labelCls} htmlFor="age-input">ECOG Score</label>
                <input
                    className={`${inputCls} ${errors.ecogScore ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Enter ECOG Score"
                    type="number"
                    min={0}
                    max={5}
                    value={ecogScore}
                    onChange={(e) => setEcogScore(e.target.value)}
                    id="ecog-input"
                />
                {errors.ecogScore && <p className={errorCls}>{errors.ecogScore}</p>}
            </div>

            {/* Mutation / Biomarker */}
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="mutation-biomarker-input">
                    Mutation or Biomarker (e.g., EGFR, KRAS)
                </label>
                <textarea
                    className={`${inputCls} border-gray-300`}
                    placeholder="Enter text here"
                    value={mutationBiomarker}
                    onChange={(e) => { setMutationBiomarker(e.target.value); setErrors(p => ({ ...p, mutationBiomarker: undefined })) }}
                    id="mutation-biomarker-input"
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex flex-row font-sm md:font-md items-center justify-center space-x-5">
                <FormButton text="Search Trials" type='submit' onClick={handleSearch} />
                <FormButton text="Reset" type='button' onClick={handleReset} />
            </div>
        </>
    )
}

export default SearchTrialsForm