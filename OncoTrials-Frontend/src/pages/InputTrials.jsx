import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PhysicianNavbar from '../components/layout/PhysicianNavbar'
import FormButton from '../components/buttons/FormButton'
import supabase from '../utils/SupabaseClient'

const EMPTY_FORM = {
    nct_id: '',
    title: '',
    summary: '',
    status: '',
    sponsor: '',
    eligibility_criteria: '',
    location_city: '',
    location_state: '',
    location_country: '',
    latitude: '',
    longitude: '',
    biomarker_criteria: '',
    organization: '',
    study_description: '',
    conditions: '',
    sex: '',
    minimum_age: '',
    start_date: '',
    primary_completion_date: '',
    completion_date: '',
    closed_at: '',
    source: 'manual',
}

const STATUS_OPTIONS = [
    'Recruiting',
    'Active, not recruiting',
    'Completed',
    'Enrolling by invitation',
    'Not yet recruiting',
    'Suspended',
    'Terminated',
    'Withdrawn',
]

const SEX_OPTIONS = ['All', 'Male', 'Female']

export default function InputTrials({ user_email }) {
    const fileInputRef = useRef(null)

    const [mode, setMode] = useState('manual') // 'manual' | 'pdf'
    const [form, setForm] = useState(EMPTY_FORM)
    const [pdfFile, setPdfFile] = useState(null)
    const [pdfParsing, setPdfParsing] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState(null) // { type: 'success'|'error', message }
    const [dragOver, setDragOver] = useState(false)

    // ── helpers ──────────────────────────────────────────────────────────────

    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    // ── PDF handling ─────────────────────────────────────────────────────────

    const handleFileDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file?.type === 'application/pdf') {
            setPdfFile(file)
        } else {
            showToast('error', 'Please upload a PDF file.')
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) setPdfFile(file)
    }

    const handleParsePdf = async () => {
        if (!pdfFile) return
        setPdfParsing(true)
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result.split(',')[1])
                reader.onerror = reject
                reader.readAsDataURL(pdfFile)
            })

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'document',
                                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                            },
                            {
                                type: 'text',
                                text: `Extract clinical trial information from this PDF and return ONLY a JSON object (no markdown, no backticks) with these exact keys:
nct_id, title, summary, status, sponsor, eligibility_criteria, location_city, location_state, location_country,
latitude, longitude, biomarker_criteria, organization, study_description, conditions, sex, minimum_age,
start_date, primary_completion_date, completion_date, closed_at.

Use empty string "" for any field not found. Dates should be in YYYY-MM-DD format. latitude and longitude should be numeric strings or "".`,
                            },
                        ],
                    }],
                }),
            })

            const data = await response.json()
            const text = data.content?.map(b => b.text || '').join('') || ''
            const clean = text.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(clean)

            setForm(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(parsed).map(([k, v]) => [k, v ?? ''])
                ),
                source: 'pdf-upload',
            }))
            setMode('manual')
            showToast('success', 'PDF parsed successfully — please review and submit.')
        } catch (err) {
            console.error(err)
            showToast('error', 'Could not parse PDF. Please fill in the form manually.')
        } finally {
            setPdfParsing(false)
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) {
            showToast('error', 'Trial title is required.')
            return
        }
        setSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const payload = {
                ...form,
                conditions: form.conditions
                ? form.conditions.split(',').map(s => s.trim()).filter(Boolean)
                : [],
                latitude: form.latitude !== '' ? parseFloat(form.latitude) : null,
                longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
                nct_id: form.nct_id || null,
                start_date: form.start_date || null,
                primary_completion_date: form.primary_completion_date || null,
                completion_date: form.completion_date || null,
                closed_at: form.closed_at || null,
                created_by: user?.id ?? undefined,
            }
            console.log(payload);
            const { error } = await supabase.from('trials').insert(payload)
            if (error) throw error

            showToast('success', 'Trial submitted successfully!')
            setForm(EMPTY_FORM)
            setPdfFile(null)
        } catch (err) {
            console.error(err)
            showToast('error', err.message || 'Submission failed. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white">

            {/* Navbar */}
            <PhysicianNavbar user_email={user_email} />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
                    ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Input Clinical Trial</h1>
                    <p className="text-gray-500 mt-1">Upload a PDF protocol or fill in the trial details manually.</p>
                </div>

                {/* Mode toggle */}
                <div className="flex gap-2 mb-8 p-1 bg-gray-100 rounded-xl w-fit border border-gray-200">
                    {['manual'].map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all
                                ${mode === m
                                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            {m === 'pdf' ? '📄 Upload PDF' : '✏️ Manual Entry'}
                        </button>
                    ))}
                </div>

                {/* ── PDF UPLOAD PANEL ── */}
                {mode === 'pdf' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Trial PDF</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Drop a clinical trial protocol or summary PDF. We'll extract the fields automatically — you can review and edit before submitting.
                        </p>

                        {/* Drop zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? 'border-gray-900 bg-gray-50'
                                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
                            <div className="text-4xl mb-3">📄</div>
                            {pdfFile ? (
                                <div>
                                    <p className="font-semibold text-gray-900">{pdfFile.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-medium text-gray-700">Drag & drop a PDF here</p>
                                    <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                                </div>
                            )}
                        </div>

                        {pdfFile && (
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleParsePdf}
                                    disabled={pdfParsing}
                                    className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-gray-700 disabled:opacity-50
                                        font-semibold text-white transition-colors"
                                >
                                    {pdfParsing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                            </svg>
                                            Parsing PDF…
                                        </span>
                                    ) : 'Extract & Review Fields'}
                                </button>
                                <button
                                    onClick={() => setPdfFile(null)}
                                    className="px-4 py-3 rounded-xl border border-gray-300 hover:border-gray-400
                                        text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MANUAL FORM ── */}
                {mode === 'manual' && (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Basic Info */}
                        <Section title="Basic Information">
                            <Field label="Trial Title" required>
                                <input name="title" value={form.title} onChange={handleChange}
                                    placeholder="Full trial title" required className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="NCT ID">
                                    <input name="nct_id" value={form.nct_id} onChange={handleChange}
                                        placeholder="e.g. NCT01234567" className={inputCls} />
                                </Field>
                                <Field label="Status">
                                    <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                                        <option value="">Select status</option>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Sponsor">
                                    <input name="sponsor" value={form.sponsor} onChange={handleChange}
                                        placeholder="Sponsoring organization" className={inputCls} />
                                </Field>
                                <Field label="Organization">
                                    <input name="organization" value={form.organization} onChange={handleChange}
                                        placeholder="Lead organization" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Conditions / Disease Areas">
                                <input name="conditions" value={form.conditions} onChange={handleChange}
                                    placeholder="e.g. Non-small cell lung cancer, NSCLC" className={inputCls} />
                            </Field>
                        </Section>

                        {/* Descriptions */}
                        <Section title="Descriptions">
                            <Field label="Summary">
                                <textarea name="summary" value={form.summary} onChange={handleChange}
                                    rows={3} placeholder="Brief trial summary" className={inputCls} />
                            </Field>
                            <Field label="Study Description">
                                <textarea name="study_description" value={form.study_description} onChange={handleChange}
                                    rows={4} placeholder="Detailed study description" className={inputCls} />
                            </Field>
                        </Section>

                        {/* Eligibility */}
                        <Section title="Eligibility">
                            <Field label="Eligibility Criteria">
                                <textarea name="eligibility_criteria" value={form.eligibility_criteria} onChange={handleChange}
                                    rows={4} placeholder="Inclusion/exclusion criteria" className={inputCls} />
                            </Field>
                            <Field label="Biomarker Criteria">
                                <textarea name="biomarker_criteria" value={form.biomarker_criteria} onChange={handleChange}
                                    rows={3} placeholder="Required biomarkers or genomic criteria" className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Sex">
                                    <select name="sex" value={form.sex} onChange={handleChange} className={inputCls}>
                                        <option value="">Any</option>
                                        {SEX_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Minimum Age">
                                    <input name="minimum_age" value={form.minimum_age} onChange={handleChange}
                                        placeholder="e.g. 18 Years" className={inputCls} />
                                </Field>
                            </div>
                        </Section>

                        {/* Location */}
                        <Section title="Location">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="City">
                                    <input name="location_city" value={form.location_city} onChange={handleChange}
                                        placeholder="City" className={inputCls} />
                                </Field>
                                <Field label="State">
                                    <input name="location_state" value={form.location_state} onChange={handleChange}
                                        placeholder="State / Province" className={inputCls} />
                                </Field>
                                <Field label="Country">
                                    <input name="location_country" value={form.location_country} onChange={handleChange}
                                        placeholder="Country" className={inputCls} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Latitude">
                                    <input name="latitude" value={form.latitude} onChange={handleChange}
                                        type="number" step="any" placeholder="e.g. 37.7749" className={inputCls} />
                                </Field>
                                <Field label="Longitude">
                                    <input name="longitude" value={form.longitude} onChange={handleChange}
                                        type="number" step="any" placeholder="e.g. -122.4194" className={inputCls} />
                                </Field>
                            </div>
                        </Section>

                        {/* Dates */}
                        <Section title="Key Dates">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Start Date">
                                    <input name="start_date" value={form.start_date} onChange={handleChange}
                                        type="date" className={inputCls} />
                                </Field>
                                <Field label="Primary Completion Date">
                                    <input name="primary_completion_date" value={form.primary_completion_date} onChange={handleChange}
                                        type="date" className={inputCls} />
                                </Field>
                                <Field label="Completion Date">
                                    <input name="completion_date" value={form.completion_date} onChange={handleChange}
                                        type="date" className={inputCls} />
                                </Field>
                                <Field label="Closed Date">
                                    <input name="closed_at" value={form.closed_at} onChange={handleChange}
                                        type="date" className={inputCls} />
                                </Field>
                            </div>
                        </Section>

                        {/* Submit */}
                        <div className="flex gap-4 pb-10">
                            <FormButton
                                type="submit"
                                text={submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                        </svg>
                                        Submitting…
                                    </span>
                                ) : 'Submit Trial'}
                                className="flex-1 md:flex-none md:px-12 py-3 rounded-xl bg-gray-900 hover:bg-gray-700
                                    disabled:opacity-50 font-semibold text-white transition-colors"
                            
                                
                            />
                            <FormButton
                                text="Reset"
                                type='button'
                                onClick={() => setForm(EMPTY_FORM)}
                            />
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">{title}</h2>
            {children}
        </div>
    )
}

function Field({ label, children, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

const inputCls = `w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900
    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
    transition-colors`