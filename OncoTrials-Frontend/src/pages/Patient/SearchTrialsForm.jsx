import React, { useState, useRef } from 'react'
import FormButton from '../../components/buttons/FormButton'
import { InfoIcon } from '@phosphor-icons/react'

// Normalize strings for comparison: lowercase, strip hyphens/underscores/spaces
const normalize = (str) =>
    (str ?? '').toLowerCase().replace(/[-_\s]+/g, '')

const MAX_AGE = 100;

function SearchTrialsForm({ trials, onFilter }) {
    const [gender, setGender] = useState('')
    const [ageMin, setAgeMin] = useState(0)
    const [ageMax, setAgeMax] = useState(MAX_AGE)
    const [trialStatus, setTrialStatus] = useState('')
    const [cancerStage, setCancerStage] = useState('')
    const [cancerType, setCancerType] = useState('')
    const [mutationBiomarker, setMutationBiomarker] = useState('');
    const [ecogScore, setEcogScore] = useState('');
    const [lineOfTreatment, setLineOfTreatment] = useState('');
    const [errors, setErrors] = useState({});
    const [resultCount, setResultCount] = useState(null)

    // Age Range slider
    const sliderTrackRef = useRef(null);
    const draggingThumb = useRef(null); // 'min' | 'max' | null

    const valueFromPointer = (clientX) => {
        const rect = sliderTrackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(ratio * MAX_AGE);
    };

    const handleThumbPointerDown = (thumb, e) => {
        e.preventDefault();
        draggingThumb.current = thumb;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleThumbPointerMove = (e) => {
        if (!draggingThumb.current) return;
        const val = valueFromPointer(e.clientX);
        if (draggingThumb.current === 'min') setAgeMin(Math.min(val, ageMax - 1));
        else setAgeMax(Math.max(val, ageMin + 1));
    };

    const handleThumbPointerUp = () => { draggingThumb.current = null; };

    const handleMinInput = (raw) => {
        const v = parseInt(raw, 10);
        if (isNaN(v)) return;
        setAgeMin(Math.max(0, Math.min(v, ageMax - 1)));
    };

    const handleMaxInput = (raw) => {
        const v = parseInt(raw, 10);
        if (isNaN(v)) return;
        setAgeMax(Math.min(MAX_AGE, Math.max(v, ageMin + 1)));
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const next = {}
        if (!cancerType.trim()) next.cancerType = 'Cancer Type is required'
        setErrors(next)
        return Object.keys(next).length === 0
    }

    // ── Filter logic ──────────────────────────────────────────────────────────
    const handleSearch = () => {
        if (!validate()) return
        if (!trials?.length) return // trials not loaded yet

        const hasAgeFilter = ageMin > 0 || ageMax < MAX_AGE

        const filtered = trials.filter(trial => {
            const trialGender = normalize(trial.sex)
            const selectedGender = normalize(gender)

            const genderMatch =
                !selectedGender ||
                trialGender === 'all' ||
                selectedGender === 'all' ||
                trialGender === selectedGender

            // Range overlap: patient [ageMin, ageMax] must overlap trial's eligibility window
            let ageMatch = true
            if (hasAgeFilter) {
                const trialMin = parseInt(trial.minimum_age, 10) || 0
                const trialMax = parseInt(trial.maximum_age, 10) || MAX_AGE
                ageMatch = ageMin <= trialMax && ageMax >= trialMin
            }

            const statusMatch =
                !trialStatus ||
                normalize(trial.status) === normalize(trialStatus)

            const conditions = trial.conditions ?? []


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
                cancerTypeMatch &&
                stageMatch &&
                biomarkerMatch
            )
        })

        setResultCount(filtered.length)
        onFilter(filtered)
    }

    // ── Reset — restore full list, clear all state ────────────────────────────
    const handleReset = () => {
        setGender('')
        setAgeMin(0)
        setAgeMax(MAX_AGE)
        setTrialStatus('')
        setCancerStage('')
        setCancerType('')
        setMutationBiomarker('')
        setEcogScore('')
        setLineOfTreatment('')
        setErrors({})
        setResultCount(null)
        onFilter(null);
        };

    // ── Shared input class ────────────────────────────────────────────────────
    const inputCls =
        'text-sm w-full px-4 py-2 border rounded-lg shadow-sm transition duration-300 ease-in-out ' +
        'focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100'

    // Narrower input for the age min/max fields — px-2 instead of px-4 so text isn't clipped
    const ageInputCls =
        'text-sm px-2 py-2 border rounded-lg shadow-sm transition duration-300 ease-in-out ' +
        'focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100'

    const fieldCls = 'w-full p-3 bg-white rounded-lg font-sans'
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

            {/* Age Range */}
            <div className={fieldCls}>
                <div className="flex items-center justify-between mb-2">
                    <label className={labelCls} style={{ marginBottom: 0 }}>Age Range</label>
                    <span className="text-sm font-semibold text-sky-600">
                        {ageMin === 0 && ageMax === MAX_AGE
                            ? 'Any'
                            : `${ageMin} – ${ageMax === MAX_AGE ? `${MAX_AGE}+` : ageMax} yrs`}
                    </span>
                </div>

                {/* Custom dual-handle slider — pointer capture keeps each thumb
                    responsive even when the cursor drifts off it mid-drag */}
                <div
                    ref={sliderTrackRef}
                    className="relative h-5 flex items-center mx-1 select-none"
                >
                    {/* Background track */}
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
                    {/* Highlighted range */}
                    <div
                        className="absolute h-1.5 rounded-full bg-sky-400"
                        style={{
                            left:  `${(ageMin / MAX_AGE) * 100}%`,
                            right: `${100 - (ageMax / MAX_AGE) * 100}%`,
                        }}
                    />
                    {/* Min thumb */}
                    <div
                        className="absolute w-4 h-4 bg-white border-2 border-sky-500 rounded-full shadow cursor-grab active:cursor-grabbing touch-none"
                        style={{ left: `calc(${(ageMin / MAX_AGE) * 100}% - 8px)`, zIndex: 3 }}
                        onPointerDown={(e) => handleThumbPointerDown('min', e)}
                        onPointerMove={handleThumbPointerMove}
                        onPointerUp={handleThumbPointerUp}
                    />
                    {/* Max thumb */}
                    <div
                        className="absolute w-4 h-4 bg-white border-2 border-sky-500 rounded-full shadow cursor-grab active:cursor-grabbing touch-none"
                        style={{ left: `calc(${(ageMax / MAX_AGE) * 100}% - 8px)`, zIndex: 4 }}
                        onPointerDown={(e) => handleThumbPointerDown('max', e)}
                        onPointerMove={handleThumbPointerMove}
                        onPointerUp={handleThumbPointerUp}
                    />
                </div>

                <div className="flex justify-between text-xs text-gray-400 mt-1 mb-3">
                    <span>0</span>
                    <span>{MAX_AGE}+</span>
                </div>

                {/* Optional direct-entry inputs — synced bidirectionally with slider */}
                <div className="flex items-center gap-2">
                    <input
                        type="number" min={0} max={ageMax - 1}
                        value={ageMin === 0 ? '' : ageMin}
                        placeholder="Min"
                        onChange={(e) => handleMinInput(e.target.value)}
                        className={`${ageInputCls} border-gray-300 text-center w-16`}
                    />
                    <span className="text-gray-400 text-sm">–</span>
                    <input
                        type="number" min={ageMin + 1} max={MAX_AGE}
                        value={ageMax === MAX_AGE ? '' : ageMax}
                        placeholder="Max"
                        onChange={(e) => handleMaxInput(e.target.value)}
                        className={`${ageInputCls} border-gray-300 text-center w-16`}
                    />
                    <span className="text-gray-400 text-xs">yrs</span>
                    {(ageMin > 0 || ageMax < MAX_AGE) && (
                        <button
                            type="button"
                            onClick={() => { setAgeMin(0); setAgeMax(MAX_AGE); }}
                            className="ml-auto text-xs text-sky-500 hover:text-sky-700"
                        >
                            Clear
                        </button>
                    )}
                </div>
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
                    <option value="metastatic">Metastatic</option>
                    <option value="advanced">Advanced</option>
                </select>
            </div>
            <div className={fieldCls}>
                <label className={labelCls} htmlFor="line-of-treatment-input">Line of Treatment</label>
                <select
                    className={`${inputCls} border-gray-300`}
                    value={lineOfTreatment}
                    onChange={(e) => setLineOfTreatment(e.target.value)}
                    id="line-of-treatment-input"
                >
                    <option value="">Select</option>
                    <option value="1">First Line</option>
                    <option value="2">Second Line</option>
                    <option value="3">Third Line</option>
                    <option value="4">Fourth Line+</option>
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
                    onChange={(e) => { setMutationBiomarker(e.target.value); }}
                    id="mutation-biomarker-input"
                    rows={5}
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