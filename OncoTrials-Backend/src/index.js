require('dotenv').config();
const express = require('express');
const cors = require('cors');

const ALLOWED_ORIGINS = [
    'https://trialsonco.com',
    'https://www.trialsonco.com',
    'https://bubbly-solution-494204-d2.web.app', // Firebase fallback URL
    'http://localhost:5173', // Vite dev server
];

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests (no Origin header) and known origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
}));
app.use(express.json());

app.use('/trials', require('./routes/trials'));
app.use('/organizations', require('./routes/organizations'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));