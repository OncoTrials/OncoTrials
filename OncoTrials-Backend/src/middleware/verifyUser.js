const { jwtVerify } = require('jose');

async function verifyUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET));
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json( { error: 'Invalid Token' });
    }    
}

module.exports = verifyUser;