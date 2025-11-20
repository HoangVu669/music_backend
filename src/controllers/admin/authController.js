/**
 * Admin Auth Controller
 */
const Admin = require('../../models/Admin');
const { signJwt } = require('../../utils/jwt');
const formatResponse = require('../../utils/formatResponse');
const { comparePassword } = require('../../utils/bcrypt');

class AdminAuthController {
  /**
   * POST /api/v1/admin/auth/login
   * Admin login
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json(
          formatResponse.failure('Username and password are required', 400)
        );
      }

      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json(
          formatResponse.failure('Invalid credentials', 401)
        );
      }

      if (!admin.isActive) {
        return res.status(403).json(
          formatResponse.failure('Account is inactive', 403)
        );
      }

      const isPasswordMatch = await comparePassword(password, admin.passwordHash);
      if (!isPasswordMatch) {
        return res.status(401).json(
          formatResponse.failure('Invalid credentials', 401)
        );
      }

      // Update last login
      admin.lastLoginAt = new Date();
      await admin.save();

      const token = signJwt({
        id: admin.adminId,
        username: admin.username,
        role: admin.role || 'admin',
      });

      res.json(
        formatResponse.success({
          admin: {
            adminId: admin.adminId,
            username: admin.username,
            role: admin.role,
          },
          token,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminAuthController();

