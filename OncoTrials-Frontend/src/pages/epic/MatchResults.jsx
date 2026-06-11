// /match/:requestId — shows the ranked list returned by /api/v1/match.
//
// The EpicLaunchLanding page stashes the result in sessionStorage under
// `oncotrials.match.<requestId>` so we can render instantly without a second
// API call. If we land here without that cached blob (deep-link, refresh
// after sessionStorage cleared, etc), we re-issue the request using the
// stored session JWT — which will likely fail if the SMART context has been
// consumed already, in which case we point the user back to EPIC.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestMatch, getSmartToken } from '../../api/matchApi';

function statusBadgeClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'recruiting':              return 'bg-emerald-100 text-emerald-800';
        case 'not yet recruiting':      return 'bg-amber-100 text-amber-800';
        case 'enrolling by invitation': return 'bg-sky-100 text-sky-800';
        default:                        return 'bg-slate-100 text-slate-700';
    }
}

// Mirrors getMatchStyle in TrialCards.jsx — shared palette for consistency.
function matchStatusStyle(status) {
    switch ((status || '').toLowerCase()) {
        case 'likely_eligible': return { bar: 'bg-green-400',  badge: 'bg-green-100 text-green-700 border-green-200',  text: 'Likely Eligible' };
        case 'eligible':        return { bar: 'bg-teal-400',   badge: 'bg-teal-100 text-teal-700 border-teal-200',     text: 'Eligible' };
        case 'needs_review':    return { bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 border-amber-200',  text: 'Needs Review' };
        case 'not_eligible':    return { bar: 'bg-red-400',    badge: 'bg-red-100 text-red-700 border-red-200',        text: 'Not Eligible' };
        default:                return { bar: 'bg-slate-200',  badge: 'bg-slate-100 text-slate-600 border-slate-200',  text: '' };
    }
}

export default function MatchResults() {
    const { requestId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const cacheKey = `oncotrials.match.${requestId}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try { setResult(JSON.parse(cached)); setLoading(false); return; }
            catch { sessionStorage.removeItem(cacheKey); }
        }

        // Fallback: re-request. Works only if the SMART session token is still
        // valid AND the backend's FHIR context entry hasn't been consumed.
        (async () => {
            try {
                const matchResult = await requestMatch({ token: getSmartToken() });
                setResult(matchResult);
            } catch (err) {
                setError(err?.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        })();
    }, [requestId]);

    if (loading) return <CenteredCard>Loading match results…</CenteredCard>;
    if (error)   return <CenteredCard variant="error">Couldn't load this match: {error}</CenteredCard>;
    if (!result) return <CenteredCard>No results.</CenteredCard>;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto p-6">
                <header className="mb-6">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <h1 className="text-2xl font-semibold text-slate-900">Top trial matches</h1>
                        <p className="text-xs text-slate-500">
                            {result.candidates_considered} candidates considered ·
                            {/* {' '}{result.ai_provider ? `AI: ${result.ai_model}` : 'AI: not used'} · */}
                            {' '}{result.cached ? 'cached' : 'fresh'}
                        </p>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Ranked by combined rule + AI relevance score. Click a card for the full eligibility breakdown.
                    </p>
                </header>

                {result.patient && <PatientSummary patient={result.patient} />}

                <ol className="space-y-3">
                    {result.results.map((trial) => <ResultCard key={trial.nct_id || trial.rank} trial={trial} />)}
                    {result.results.length === 0 && (
                        <p className="text-sm text-slate-500 italic">
                            No matching trials. Try broadening the patient profile or contact your administrator.
                        </p>
                    )}
                </ol>

                <div className="mt-8 text-center">
                    <Link to="/" className="text-sm text-sky-600 hover:underline">Back to TrialsOnco</Link>
                </div>
            </div>
        </div>
    );
}

function PatientSummary({ patient }) {
    const fields = [
        { label: 'Age',        value: patient.age },
        { label: 'Sex',        value: patient.gender },
        { label: 'Diagnosis',  value: patient.cancerType },
        { label: 'Stage',      value: patient.cancerStage },
        { label: 'Biomarker',  value: patient.mutationBiomarker },
        { label: 'ECOG',       value: patient.ecog },
        { label: 'Prior lines', value: patient.lineOfTreatment },
    ].filter((field) => field.value !== null && field.value !== undefined && field.value !== '');

    return (
        <section className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="h-1.5 w-full bg-sky-400" />
            <div className="p-4">
                <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Patient context</h2>
                    <span className="text-[10px] text-slate-400">de-identified · source: EHR</span>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                    {fields.map(({ label, value }) => (
                        <div key={label} className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                            <dd className="text-slate-900 font-medium truncate" title={String(value)}>{String(value)}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

function ResultCard({ trial }) {
    const [open, setOpen] = useState(false);
    const matchStyle = useMemo(() => matchStatusStyle(trial.rule_status), [trial.rule_status]);

    return (
        <li className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Accent bar — same color palette as TrialCards.jsx */}
            <div className={`h-1.5 w-full ${matchStyle.bar}`} />
            <div className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 flex flex-col items-center pt-1">
                    <div className="text-lg font-bold text-slate-400">#{trial.rank}</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-900 truncate">{trial.title}</h2>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {matchStyle.text && (
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${matchStyle.badge}`}>
                                    {matchStyle.text}
                                </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(trial.status)}`}>{trial.status}</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {trial.nct_id} · {trial.sponsor || 'Unknown sponsor'}
                        {trial.location?.city ? ` · ${trial.location.city}${trial.location.country ? `, ${trial.location.country}` : ''}` : ''}
                    </p>
                    <p className="text-sm text-slate-900 mt-2">{trial.rationale}</p>

                    <button
                        type="button"
                        onClick={() => setOpen((prev) => !prev)}
                        className="mt-2 text-xs text-sky-600 hover:underline"
                    >
                        {open ? 'Hide eligibility breakdown' : 'Show eligibility breakdown'}
                    </button>

                    {open && (
                        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
                            <Section title="Matched inclusion"    items={trial.matched_inclusion}   tone="ok" />
                            <Section title="Unmet inclusion"      items={trial.unmet_inclusion}     tone="warn" />
                            <Section title="Exclusions to review" items={trial.relevant_exclusions} tone="bad" />
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

function Section({ title, items, tone }) {
    const toneClass = {
        ok:   'border-green-200 bg-green-50/40',
        warn: 'border-amber-200 bg-amber-50/40',
        bad:  'border-red-200   bg-red-50/40',
    }[tone] || 'border-slate-200 bg-slate-50';

    return (
        <div className={`rounded-lg border ${toneClass} p-2`}>
            <div className="font-medium text-slate-900 mb-1">{title}</div>
            {(items || []).length === 0
                ? <div className="text-slate-400 italic">None</div>
                : <ul className="list-disc list-inside space-y-1 text-slate-900">
                    {items.map((reason, idx) => <li key={idx}>{reason}</li>)}
                  </ul>}
        </div>
    );
}

function CenteredCard({ children, variant }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className={`max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center ${variant === 'error' ? 'border-rose-200 text-rose-700' : 'border-slate-200 text-slate-700'}`}>
                {children}
            </div>
        </div>
    );
}
