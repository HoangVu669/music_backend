const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

class AdminAuthController {
  // POST /admin/auth/register
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check if requester is super-admin
      const requester = await User.findById(req.user.userId);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super-admin can register new admins'
        });
      }

      const { email, password, fullName, phone } = req.body;

      // Check if admin already exists
      const existingAdmin = await User.findOne({ 
        $or: [{ email }, { phone }] 
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin already exists with this email or phone'
        });
      }

      // Create new admin
      const admin = new User({
        email,
        password,
        fullName,
        phone,
        role: 'admin',
        isVerified: true,
        isActive: true
      });

      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: admin._id, 
          email: admin.email,
          role: admin.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        data: {
          admin: admin.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Admin register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/auth/login
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find admin by email
      const admin = await User.findOne({ email, role: 'admin' });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: admin._id, 
          email: admin.email,
          role: admin.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Admin login successful',
        data: {
          admin: admin.getPublicProfile(),
          token
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/auth/logout
  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Admin logout successful'
      });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/me
  async getProfile(req, res) {
    try {
      const admin = await User.findById(req.user.userId);
      if (!admin || admin.role !== 'admin') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: admin.getPublicProfile()
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/me
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { fullName, phone, avatar } = req.body;
      const adminId = req.user.userId;

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Update allowed fields
      if (fullName) admin.fullName = fullName;
      if (phone) admin.phone = phone;
      if (avatar) admin.avatar = avatar;

      await admin.save();

      res.json({
        success: true,
        message: 'Admin profile updated successfully',
        data: admin.getPublicProfile()
      });
    } catch (error) {
      console.error('Update admin profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/me/password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const adminId = req.user.userId;

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      admin.password = newPassword;
      await admin.save();

      res.json({
        success: true,
        message: 'Admin password changed successfully'
      });
    } catch (error) {
      console.error('Change admin password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AdminAuthController();
