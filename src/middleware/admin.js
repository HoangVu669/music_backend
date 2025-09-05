const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify admin JWT token
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is admin
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin' || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token or insufficient privileges.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
};

// Middleware to check if admin is super-admin
const superAdminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // For now, all admins are considered super-admin
    // You can add a specific field like isSuperAdmin in the future
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super-admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Super admin auth error:', error);
    res.status(403).json({
      success: false,
      message: 'Access denied. Super-admin privileges required.'
    });
  }
};

module.exports = {
  adminAuth,
  superAdminAuth
};
