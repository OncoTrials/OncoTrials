import React, { useEffect, useRef, useState } from "react";
import { STATUS_OPTIONS } from "../../utils/TrialCardUtils";
import { updateTrial } from "../../api/trialsApi";



const emptyForm = {
    title: "",
    status: "",
    summary: "",
    sponsor: "",
    biomarker_criteria: "",
    study_description: "",
    source: "",
    organization: "",
    sex: "",
    minimum_age: "",
    maximum_age: "",
    conditions: "",       // comma-separated in the form, array in the DB
    locations: "",        // JSON string in the form, jsonb array in the DB
    start_date: "",
    primary_completion_date: "",
    completion_date: "",
    closed_at: "",
};

// ---- conversions between DB shape and editable form shape ----

const toDateInputValue = (value) => {
    if (!value) return "";
    return String(value).slice(0, 10); // handles both 'YYYY-MM-DD' and full ISO timestamps
};

const arrayToText = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");
const textToArray = (text) =>
    text.split(",").map((s) => s.trim()).filter(Boolean);

const jsonToText = (value) => {
    if (value === null || value === undefined) return "";
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return "";
    }
};

function trialToForm(trial) {
    return {
        title: trial?.title ?? "",
        status: trial?.status?.toUpperCase() ?? "",
        summary: trial?.summary ?? "",
        sponsor: trial?.sponsor ?? "",
        biomarker_criteria: trial?.biomarker_criteria ?? "",
        study_description: trial?.study_description ?? "",
        source: trial?.source ?? "",
        organization: trial?.organization ?? "",
        sex: trial?.sex ?? "",
        minimum_age: trial?.minimum_age ?? "",
        maximum_age: trial?.maximum_age ?? "",
        conditions: arrayToText(trial?.conditions),
        locations: jsonToText(trial?.locations),
        start_date: toDateInputValue(trial?.start_date),
        primary_completion_date: toDateInputValue(trial?.primary_completion_date),
        completion_date: toDateInputValue(trial?.completion_date),
        closed_at: toDateInputValue(trial?.closed_at),
    };
}

// Converts the editable form shape back to a DB payload. Throws with a
// human-readable message if a field can't be parsed, so the caller can show
// it inline instead of silently sending bad data.
function formToPayload(form) {
    const payload = {
        title: form.title.trim(),
        // Canonical uppercase form — backend consumers compare exactly.
        status: form.status ? form.status.toUpperCase() : null,
        summary: form.summary || null,
        sponsor: form.sponsor || null,
        biomarker_criteria: form.biomarker_criteria || null,
        study_description: form.study_description || null,
        source: form.source || null,
        organization: form.organization || null,
        sex: form.sex || null,
        minimum_age: form.minimum_age || null,
        maximum_age: form.maximum_age || null,
        conditions: textToArray(form.conditions),
        start_date: form.start_date || null,
        primary_completion_date: form.primary_completion_date || null,
        completion_date: form.completion_date || null,
        closed_at: form.closed_at || null,
    };

    if (form.locations.trim() === "") {
        payload.locations = null;
    } else {
        try {
            payload.locations = JSON.parse(form.locations);
        } catch {
            throw new Error("Locations must be valid JSON.");
        }
    }

    return payload;
}

function FormField({ label, htmlFor, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
                {label}
            </label>
            {children}
        </div>
    );
}

function SectionHeading({ children }) {
    return (
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
            {children}
        </h3>
    );
}

const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200";

function formatMeta(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function EditTrial({
    trial,
    isOpen,
    onClose,
    onSaveSuccess,
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState(trial ? trialToForm(trial) : emptyForm);
    const [initialForm, setInitialForm] = useState(trial ? trialToForm(trial) : emptyForm);
    const titleInputRef = useRef(null);

    // Reset form (and dirty-check baseline, and any stale error) whenever a
    // new trial is loaded into the modal.
    useEffect(() => {
        if (!isOpen ||!trial) return;
        const next = trialToForm(trial);
        setForm(next);
        setInitialForm(next);
        setError(null);
    }, [isOpen,trial]);

    // Autofocus the title field when the modal opens.
    useEffect(() => {
        if (isOpen) titleInputRef.current?.focus();
    }, [isOpen]);

    // Close on Escape, but not while a save is in flight.
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, saving, onClose]);

    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClose = () => {
        if (saving) return;
        onClose();
    };

    const handleSave = async () => {
        if (!isDirty) return;

        if (form.title.trim() === "") {
            setError("Title is required.");
            return;
        }

        let payload;
        try {
            payload = formToPayload(form);
        } catch (err) {
            setError(err.message);
            return;
        }

        try {
            setSaving(true);
            setError(null);

            await updateTrial(trial.id, payload);

            if (onSaveSuccess) {
                onSaveSuccess();
            }

            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to update trial. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !trial) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={handleClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-trial-title"
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 id="edit-trial-title" className="text-xl font-semibold text-gray-900">
                        Edit Trial
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Update trial information.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto">

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3"
                        >
                            {error}
                        </div>
                    )}

                    <SectionHeading>Basic Info</SectionHeading>

                    <FormField label="Title" htmlFor="edit-trial-title-input">
                        <input
                            id="edit-trial-title-input"
                            ref={titleInputRef}
                            value={form.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Status" htmlFor="edit-trial-status">
                        <select
                            id="edit-trial-status"
                            value={form.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                            className={inputClass}
                        >
                            <option value="">—</option>
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Sponsor" htmlFor="edit-trial-sponsor">
                            <input
                                id="edit-trial-sponsor"
                                value={form.sponsor}
                                onChange={(e) => handleChange("sponsor", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Organization" htmlFor="edit-trial-organization">
                            <input
                                id="edit-trial-organization"
                                value={form.organization}
                                onChange={(e) => handleChange("organization", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <FormField label="Source" htmlFor="edit-trial-source">
                        <input
                            id="edit-trial-source"
                            value={form.source}
                            onChange={(e) => handleChange("source", e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <SectionHeading>Description &amp; Criteria</SectionHeading>

                    <FormField label="Summary" htmlFor="edit-trial-summary">
                        <textarea
                            id="edit-trial-summary"
                            rows={4}
                            value={form.summary}
                            onChange={(e) => handleChange("summary", e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Study Description" htmlFor="edit-trial-study-description">
                        <textarea
                            id="edit-trial-study-description"
                            rows={4}
                            value={form.study_description}
                            onChange={(e) => handleChange("study_description", e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <FormField label="Biomarker Criteria" htmlFor="edit-trial-biomarker-criteria">
                        <textarea
                            id="edit-trial-biomarker-criteria"
                            rows={4}
                            value={form.biomarker_criteria}
                            onChange={(e) => handleChange("biomarker_criteria", e.target.value)}
                            className={inputClass}
                        />
                    </FormField>

                    <SectionHeading>Demographics</SectionHeading>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField label="Sex" htmlFor="edit-trial-sex">
                            <input
                                id="edit-trial-sex"
                                value={form.sex}
                                onChange={(e) => handleChange("sex", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Minimum Age" htmlFor="edit-trial-min-age">
                            <input
                                id="edit-trial-min-age"
                                value={form.minimum_age}
                                onChange={(e) => handleChange("minimum_age", e.target.value)}
                                placeholder="e.g. 18 Years"
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Maximum Age" htmlFor="edit-trial-max-age">
                            <input
                                id="edit-trial-max-age"
                                value={form.maximum_age}
                                onChange={(e) => handleChange("maximum_age", e.target.value)}
                                placeholder="e.g. 75 Years"
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    <FormField label="Conditions (comma-separated)" htmlFor="edit-trial-conditions">
                        <input
                            id="edit-trial-conditions"
                            value={form.conditions}
                            onChange={(e) => handleChange("conditions", e.target.value)}
                            placeholder="e.g. Non-Small Cell Lung Cancer, EGFR-Positive"
                            className={inputClass}
                        />
                    </FormField>

                    <SectionHeading>Location</SectionHeading>

                    <FormField label="Locations (JSON array of site objects)" htmlFor="edit-trial-locations">
                        <textarea
                            id="edit-trial-locations"
                            rows={8}
                            value={form.locations}
                            onChange={(e) => handleChange("locations", e.target.value)}
                            placeholder='[{"facility": "...", "city": "...", "state": "...", "country": "...", "status": "RECRUITING"}]'
                            className={`${inputClass} font-mono text-xs`}
                        />
                    </FormField>

                    <SectionHeading>Dates</SectionHeading>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Start Date" htmlFor="edit-trial-start-date">
                            <input
                                id="edit-trial-start-date"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => handleChange("start_date", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Primary Completion Date" htmlFor="edit-trial-primary-completion">
                            <input
                                id="edit-trial-primary-completion"
                                type="date"
                                value={form.primary_completion_date}
                                onChange={(e) => handleChange("primary_completion_date", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Completion Date" htmlFor="edit-trial-completion-date">
                            <input
                                id="edit-trial-completion-date"
                                type="date"
                                value={form.completion_date}
                                onChange={(e) => handleChange("completion_date", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                        <FormField label="Closed At" htmlFor="edit-trial-closed-at">
                            <input
                                id="edit-trial-closed-at"
                                type="date"
                                value={form.closed_at}
                                onChange={(e) => handleChange("closed_at", e.target.value)}
                                className={inputClass}
                            />
                        </FormField>
                    </div>

                    {/* Read-only system/audit fields — not part of `form`, never sent on save */}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                        <div>Created: {formatMeta(trial.created_at)}</div>
                        <div>Created By: {trial.created_by || "—"}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
                    <button
                        onClick={handleClose}
                        disabled={saving}
                        className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}