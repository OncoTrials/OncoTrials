require('dotenv').config();
const express = require('express');
const cors = require('cors');
const protocolRoutes = require('./routes/protocols');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/trials', require('./routes/trials'));
app.use('/api', protocolRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));