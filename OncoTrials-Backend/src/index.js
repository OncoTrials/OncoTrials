require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

const ALLOWED_ORIGINS = [
    'https://trialsonco.com',
    'https://www.trialsonco.com',
    'https://bubbly-solution-494204-d2.web.app', // Firebase production URL
    'http://localhost:5173',                     // Vite dev server
];

// Firebase Hosting preview channels look like:
//   https://<project-id>--<channel-name>-<hash>.web.app
// We allow any preview channel under our own project so feature branches
// deployed via `firebase hosting:channel:deploy <name>` can hit the backend.
const FIREBASE_PREVIEW_RE = /^https:\/\/bubbly-solution-494204-d2--[a-z0-9-]+\.web\.app$/i;

const app = express();
app.use(compression());
app.use(cors({
    origin: (origin, callback) => {
        // Server-to-server (no Origin header), known fixed origins, or a
        // Firebase preview channel under our project. Disallowed origins get
        // `false` (no CORS headers; the browser blocks the response) rather
        // than an Error — an Error here surfaced as a 500 for every stray
        // origin and polluted the error logs.
        callback(null, !origin
            || ALLOWED_ORIGINS.includes(origin)
            || FIREBASE_PREVIEW_RE.test(origin));
    },
}));
app.use(express.json());

app.use('/trials', require('./routes/trials'));
app.use('/organizations', require('./routes/organizations'));
app.use('/api/v1/match', require('./routes/api/v1/match'));
app.use('/fhir/launch',   require('./routes/fhir/launch'));
app.use('/fhir/callback', require('./routes/fhir/callback'));
app.use('/fhir/health',   require('./routes/fhir/health'));

// Final error handler: full detail to the server log, generic JSON to the
// client. Without this, Express's default handler echoes stack traces to
// clients whenever NODE_ENV isn't 'production'.
app.use((err, req, res, next) => {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err?.stack || err);
    if (res.headersSent) return next(err);
    res.status(err?.status || 500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));