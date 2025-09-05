const { verifyJwt } = require('../utils/jwt');

function authMiddleware(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (requiredRole && payload.role !== requiredRole) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.user = payload;
    next();
  };
}

module.exports = { authMiddleware };


