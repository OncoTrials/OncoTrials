// src/middleware/auth.js
const supabase = require('../db/supabaseClient');

/**
 * Verify JWT token and set req.user
 */
async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get user role from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return res.status(403).json({ error: 'User not found in database' });
    }
    
    // Set req.user for use in route handlers
    req.user = {
      id: user.id,
      email: userData.email,
      role: userData.role
    };
    
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticateUser };