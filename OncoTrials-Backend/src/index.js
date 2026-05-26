require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
app.use(cors({
    origin: (origin, callback) => {
        // Server-to-server (no Origin header), known fixed origins, or a
        // Firebase preview channel under our project.
        if (!origin
            || ALLOWED_ORIGINS.includes(origin)
            || FIREBASE_PREVIEW_RE.test(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
}));
app.use(express.json());

app.use('/trials', require('./routes/trials'));
app.use('/organizations', require('./routes/organizations'));
app.use('/api/v1/match', require('./routes/api/v1/match'));
app.use('/fhir/launch',   require('./routes/fhir/launch'));
app.use('/fhir/callback', require('./routes/fhir/callback'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));