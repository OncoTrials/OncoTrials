const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Fetches every trial in one response. Backend transparently paginates
// Supabase (1000 rows at a time, since PostgREST caps single responses) on
// the first request after a cache version change, then serves the cached
// union from Redis (24h TTL) for every subsequent request. So this is fast
// even though it returns ~24K rows.
export async function getAllTrials() {
    const res = await fetch(`${API_BASE}/trials?limit=all`);
    if (!res.ok) throw new Error(`Failed to fetch trials: ${res.status}`);
    const { data } = await res.json();
    return data ?? [];
}

export async function updateTrial(trialId, updatedFields) {
    const res = await fetch(`${API_BASE}/trials/${trialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
    });
    if (!res.ok) throw new Error(`Failed to update trial ${trialId}: ${res.status}`);
    return res.json();
}

// Loads the trial list as a *stream* of batches instead of one big response.
//
// The backend replies in NDJSON ("newline-delimited JSON"): one self-contained
// JSON object per line, e.g.
//     {"chunk":0,"data":[...500 trials...],"total":24000,"done":false}\n
//     {"chunk":1,"data":[...500 trials...],"total":24000,"done":true}\n
// We read the response as it arrives and call `onChunk` once per complete line,
// so the UI can render the first batch long before the last one downloads.
//
// Parameters:
//   onChunk(trialsBatch, { chunkIndex, total, done }) — called for each batch.
//   signal — an optional AbortSignal. Callers (e.g. a React effect) pass one so
//            they can cancel the in-flight request; without it, React StrictMode
//            remounts would leave an orphaned, never-cancelled request running.
//
// Returns a promise that resolves once the whole stream has been consumed.
export async function streamAllTrials(onChunk, signal) {
    const response = await fetch(`${API_BASE}/trials/stream`, { signal });
    if (!response.ok) throw new Error(`Failed to stream trials: ${response.status}`);

    // Reads the response body as raw bytes, piece by piece, as it arrives.
    const streamReader = response.body.getReader();
    // Turns those raw bytes back into text.
    const textDecoder = new TextDecoder();
    // A network packet can split a line in half, so we hold any text after the
    // last newline here and prepend it to the next packet before splitting again.
    let leftoverText = '';

    // Parses one NDJSON line and forwards it to the caller via onChunk.
    const emitLine = (line) => {
        if (!line.trim()) return; // skip blank lines
        try {
            const parsedLine = JSON.parse(line);
            onChunk(parsedLine.data || [], {
                chunkIndex: parsedLine.chunk,
                total: parsedLine.total,
                done: parsedLine.done,
            });
        } catch (parseError) {
            console.warn('[streamAllTrials] could not parse a streamed line:', parseError);
        }
    };

    // Pull batches until the server closes the stream.
    while (true) {
        const { done: streamFinished, value: bytes } = await streamReader.read();
        if (streamFinished) break;

        leftoverText += textDecoder.decode(bytes, { stream: true });
        const lines = leftoverText.split('\n');
        // The last element may be a partial line; keep it for the next read.
        leftoverText = lines.pop();

        for (const line of lines) emitLine(line);
    }

    // The stream ended; emit whatever (complete) line is still buffered.
    if (leftoverText.trim()) emitLine(leftoverText);
}

// Fetches a single trial's full detail (all columns) by its UUID.
export async function getTrialById(id) {
    const res = await fetch(`${API_BASE}/trials/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch trial ${id}: ${res.status}`);
    return res.json();
}
