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

function scoreColor(score) {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-sky-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
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
                const r = await requestMatch({ token: getSmartToken() });
                setResult(r);
            } catch (err) {
                setError(err?.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        })();
    }, [requestId]);

    if (loading) return <CenteredCard>Loading match results…</CenteredCard>;
    if (error)   return <CenteredCard variant="error">Couldn’t load this match: {error}</CenteredCard>;
    if (!result) return <CenteredCard>No results.</CenteredCard>;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto p-6">
                <header className="mb-6">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <h1 className="text-2xl font-semibold text-slate-900">Top trial matches</h1>
                        <p className="text-xs text-slate-500">
                            {result.candidates_considered} candidates considered ·
                            {' '}{result.ai_provider ? `AI: ${result.ai_model}` : 'AI: not used'} ·
                            {' '}{result.cached ? 'cached' : 'fresh'}
                        </p>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Ranked by combined rule + AI relevance score. Click a card for the full eligibility breakdown.
                    </p>
                </header>

                <ol className="space-y-3">
                    {result.results.map((r) => <ResultCard key={r.nct_id || r.rank} r={r} />)}
                    {result.results.length === 0 && (
                        <p className="text-sm text-slate-500 italic">
                            No matching trials. Try broadening the patient profile or contact your administrator.
                        </p>
                    )}
                </ol>

                <div className="mt-8 text-center">
                    <Link to="/" className="text-sm text-sky-600 hover:underline">Back to OncoTrials</Link>
                </div>
            </div>
        </div>
    );
}

function ResultCard({ r }) {
    const [open, setOpen] = useState(false);
    const dotClass = useMemo(() => scoreColor(r.relevance_score), [r.relevance_score]);

    return (
        <li className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-full ${dotClass} text-white flex items-center justify-center text-lg font-semibold`}>
                        {r.relevance_score}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">#{r.rank}</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-900 truncate">{r.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(r.status)}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {r.nct_id} · {r.sponsor || 'Unknown sponsor'}
                        {r.location?.city ? ` · ${r.location.city}${r.location.country ? `, ${r.location.country}` : ''}` : ''}
                    </p>
                    <p className="text-sm text-slate-700 mt-2">{r.rationale}</p>

                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="mt-2 text-xs text-sky-600 hover:underline"
                    >
                        {open ? 'Hide eligibility breakdown' : 'Show eligibility breakdown'}
                    </button>

                    {open && (
                        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs text-slate-700">
                            <Section title="Matched inclusion" items={r.matched_inclusion} tone="ok" />
                            <Section title="Unmet inclusion"   items={r.unmet_inclusion}   tone="warn" />
                            <Section title="Exclusions to review" items={r.relevant_exclusions} tone="bad" />
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

function Section({ title, items, tone }) {
    const toneClass = {
        ok:   'border-emerald-200 bg-emerald-50/40',
        warn: 'border-amber-200   bg-amber-50/40',
        bad:  'border-rose-200    bg-rose-50/40',
    }[tone] || 'border-slate-200 bg-slate-50';

    return (
        <div className={`rounded-lg border ${toneClass} p-2`}>
            <div className="font-medium text-slate-800 mb-1">{title}</div>
            {(items || []).length === 0
                ? <div className="text-slate-400 italic">None</div>
                : <ul className="list-disc list-inside space-y-1">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>}
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
