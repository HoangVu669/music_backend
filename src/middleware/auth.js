const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate user via JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Prefer cookie token, fallback to Authorization header
    const cookieToken = req.cookies && (req.cookies.token || req.cookies.access_token);
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.apiError('Access token is required', 'UNAUTHORIZED');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    
    if (!user) {
      return res.apiError('Invalid token - user not found', 'UNAUTHORIZED');
    }

    if (!user.isActive) {
      return res.apiError('Account is deactivated', 'UNAUTHORIZED');
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.apiError('Invalid token', 'UNAUTHORIZED');
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.apiError('Token expired', 'UNAUTHORIZED');
    }

    return res.apiError('Authentication error', 'UNAUTHORIZED');
  }
};

// Middleware to check if user has specific role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.apiError('Authentication required', 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return res.apiError('Insufficient permissions', 'FORBIDDEN');
    }

    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user is artist or admin
const requireArtistOrAdmin = requireRole('artist', 'admin');

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (modelName, idField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.apiError('Authentication required', 'UNAUTHORIZED');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[idField];
      const Model = require(`../models/${modelName}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.apiError('Resource not found', 'NOT_FOUND');
      }

      // Check ownership
      const ownerField = modelName === 'User' ? '_id' : 'owner';
      if (resource[ownerField].toString() !== req.user._id.toString()) {
        return res.apiError('Access denied - you do not own this resource', 'FORBIDDEN');
      }

      next();
    } catch (error) {
      return res.apiError('Authorization error', 'FORBIDDEN');
    }
  };
};

// Middleware to check subscription status
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.apiError('Authentication required', 'UNAUTHORIZED');
  }

  if (req.user.subscription.type === 'free') {
    return res.apiError('Premium subscription required for this feature', 'FORBIDDEN');
  }

  if (!req.user.subscription.isActive) {
    return res.apiError('Premium subscription is not active', 'FORBIDDEN');
  }

  next();
};

// Middleware to check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.apiError('Authentication required', 'UNAUTHORIZED');
  }

  if (!req.user.isVerified) {
    return res.apiError('Email verification required', 'FORBIDDEN');
  }

  next();
};

// Rate limiting middleware (basic implementation)
const rateLimitBasic = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (requests.has(ip)) {
      requests.set(ip, requests.get(ip).filter(timestamp => timestamp > windowStart));
    }

    const userRequests = requests.get(ip) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.apiError('Too many requests, please try again later', 'RATE_LIMIT');
    }

    userRequests.push(now);
    requests.set(ip, userRequests);

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireArtistOrAdmin,
  requireOwnershipOrAdmin,
  requirePremium,
  requireVerification,
  rateLimit: rateLimitBasic
}; 