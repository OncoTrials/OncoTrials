// // middleware/verifyUser.js
// const jwt = require('jsonwebtoken');

// // Replace this with your Supabase JWT secret from your Supabase project settings
// const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// module.exports = function verifyUser(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'Missing auth token' });
//   }

//   try {
//     const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error('JWT verification failed:', err.message);
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };
