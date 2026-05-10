const jwt = require('jsonwebtoken');

// Replace with actual values
const payload = {
  sub: 'b2f87b42-a1d8-47b1-b8ad-635f525765e9',
  role: 'crc'
};

const secret = '<secret>>'; // From Supabase Settings > API > JWT Secret

const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('JWT:', token);
