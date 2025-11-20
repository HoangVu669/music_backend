const { verifyJwt } = require('../utils/jwt');
const formatResponse = require('../utils/formatResponse');

function authMiddleware(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json(
        formatResponse.failure('Unauthorized - Token is required', 401)
      );
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return res.status(401).json(
        formatResponse.failure('Unauthorized - Invalid or expired token', 401)
      );
    }
    if (requiredRole && payload.role !== requiredRole) {
      return res.status(403).json(
        formatResponse.failure('Forbidden - Insufficient permissions', 403)
      );
    }
    req.user = payload;
    next();
  };
}

module.exports = { authMiddleware };


