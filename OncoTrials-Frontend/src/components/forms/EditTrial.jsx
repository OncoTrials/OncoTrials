// src/components/modals/EditTrial.jsx

import React, { useEffect, useState } from "react";
// import { updateTrial } from "../../api/trialsApi";

export default function EditTrial({
    trial,
    isOpen,
    onClose,
    onSaveSuccess,
}) {
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: "",
        status: "",
        summary: "",
        eligibility_criteria_summary: "",
    });

    useEffect(() => {
        if (!trial) return;

        setForm({
            title: trial.title ?? "",
            status: trial.status ?? "",
            summary: trial.summary ?? "",
            eligibility_criteria_summary:
                trial.eligibility_criteria_summary ?? "",
        });
    }, [trial]);

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            await updateTrial(trial.id, form);

            if (onSaveSuccess) {
                onSaveSuccess();
            }

            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to update trial.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !trial) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Edit Trial
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Update trial information.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Title
                        </label>
                        <input
                            value={form.title}
                            onChange={(e) =>
                                handleChange("title", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Status
                        </label>

                        <select
                            value={form.status}
                            onChange={(e) =>
                                handleChange("status", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        >
                            <option value="recruiting">
                                Recruiting
                            </option>

                            <option value="not_yet_recruiting">
                                Not Yet Recruiting
                            </option>

                            <option value="active_not_recruiting">
                                Active Not Recruiting
                            </option>

                            <option value="completed">
                                Completed
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Summary
                        </label>

                        <textarea
                            rows={5}
                            value={form.summary}
                            onChange={(e) =>
                                handleChange("summary", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Eligibility Criteria Summary
                        </label>

                        <textarea
                            rows={8}
                            value={form.eligibility_criteria_summary}
                            onChange={(e) =>
                                handleChange(
                                    "eligibility_criteria_summary",
                                    e.target.value
                                )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl font-semibold"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}