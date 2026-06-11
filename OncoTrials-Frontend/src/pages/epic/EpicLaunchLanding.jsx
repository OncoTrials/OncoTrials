// /epic/launched — landing page after EPIC -> /fhir/callback redirects here.
//
// The backend puts the session JWT in the URL fragment so it never hits server
// access logs. We pull it out, stash it in sessionStorage, then immediately
// ask the backend to run a match. As soon as it returns, we navigate to the
// results page.
//
// Failure modes:
//   - No token in the URL (user landed here directly)  -> show a friendly error
//   - /api/v1/match returns 410 (context expired)      -> ask user to re-launch
//   - Any other error                                   -> generic error + try-again link

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeSmartSession, requestMatch } from '../../api/matchApi';

function parseHashParams() {
    // window.location.hash is like '#token=...&rid=...'
    const h = (window.location.hash || '').replace(/^#/, '');
    return new URLSearchParams(h);
}

export default function EpicLaunchLanding() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('starting');
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const params = parseHashParams();
            const token = params.get('token');
            const rid   = params.get('rid');

            if (!token || !rid) {
                setStatus('error');
                setErrorMsg('This page is only reachable after an EPIC launch.');
                return;
            }

            // Clear the fragment so refreshing won't replay an expired token.
            window.history.replaceState({}, '', window.location.pathname);
            storeSmartSession({ token, rid });

            try {
                setStatus('matching');
                // Every SMART launch is a fresh clinical context — bypass the
                // 24h result cache so clinicians never see stale rankings.
                // (The cache still serves frontend re-renders of /match/:rid
                // via sessionStorage; this only affects re-requests to the API.)
                const result = await requestMatch({ token, refresh: true });
                if (cancelled) return;

                // Stash the result locally so the next page renders instantly
                // without re-hitting the API.
                sessionStorage.setItem(`oncotrials.match.${result.request_id}`, JSON.stringify(result));
                navigate(`/match/${result.request_id}`, { replace: true });
            } catch (err) {
                if (cancelled) return;
                setStatus('error');
                setErrorMsg(err?.message || 'Unknown error');
            }
        })();

        return () => { cancelled = true; };
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                {status === 'starting' && (
                    <>
                        <h1 className="text-xl font-semibold text-slate-900">Launching OncoTrials…</h1>
                        <p className="text-sm text-slate-500 mt-2">Reading patient context from your EHR.</p>
                    </>
                )}
                {status === 'matching' && (
                    <>
                        <h1 className="text-xl font-semibold text-slate-900">Finding relevant trials…</h1>
                        <p className="text-sm text-slate-500 mt-2">This usually takes a few seconds.</p>
                        <div className="mt-6 h-1 w-full bg-slate-100 rounded overflow-hidden">
                            <div className="h-full w-1/3 bg-sky-500 animate-pulse" />
                        </div>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <h1 className="text-xl font-semibold text-rose-700">We couldn’t complete the launch</h1>
                        <p className="text-sm text-slate-600 mt-2">{errorMsg}</p>
                        <p className="text-xs text-slate-400 mt-4">
                            Please return to EPIC and re-launch TrialsOnco, or contact your administrator.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
