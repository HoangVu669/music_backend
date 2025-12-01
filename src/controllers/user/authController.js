/**
 * Auth Controller - User Authentication
 */
const User = require('../../models/User');
const { signJwt } = require('../../utils/jwt');
const formatResponse = require('../../utils/formatResponse');
const { USER_STATUS } = require('../../models/Enum');

class AuthController {
  /**
   * POST /api/v1/user/auth/register
   * Đăng ký user mới
   * Body: { username, email, password, fullname? }
   * Response: { success: true, message: "success", data: { user, token } }
   */
  async register(req, res, next) {
    try {
      const { username, email, password, fullname } = req.body;

      // Validation - Check required fields
      if (!username || !email || !password) {
        return res.status(400).json(
          formatResponse.failure('Username, email, and password are required', 400)
        );
      }

      // Validation - Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(
          formatResponse.failure('Invalid email format', 400)
        );
      }

      // Validation - Username format (alphanumeric, underscore, 3-20 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json(
          formatResponse.failure('Username must be 3-20 characters long and contain only letters, numbers, and underscores', 400)
        );
      }

      // Validation - Password strength (minimum 6 characters)
      if (password.length < 6) {
        return res.status(400).json(
          formatResponse.failure('Password must be at least 6 characters long', 400)
        );
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email: email.toLowerCase() }],
      });

      if (existingUser) {
        const field = existingUser.username === username ? 'Username' : 'Email';
        return res.status(409).json(
          formatResponse.failure(`${field} already exists`, 409)
        );
      }

      // Create user (password will be hashed by pre-save hook)
      const user = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password,
        fullname: fullname ? fullname.trim() : username.trim(),
        status: USER_STATUS.ACTIVE, // Auto activate for now
      });

      // Generate JWT token
      const token = signJwt({
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user',
      });

      res.status(201).json(
        formatResponse.success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          token,
        }, 'Registration successful')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/auth/login
   * Đăng nhập
   * Body: { username (username or email), password }
   * Response: { success: true, message: "success", data: { user, token } }
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Validation - Check required fields
      if (!username || !password) {
        return res.status(400).json(
          formatResponse.failure('Username (or email) and password are required', 400)
        );
      }

      // Find user by username or email - tối ưu query với select chỉ fields cần thiết
      const trimmedUsername = username.trim();
      const lowerEmail = trimmedUsername.toLowerCase();

      // Select chỉ các fields cần thiết để giảm data transfer và tăng tốc độ
      const user = await User.findOne({
        $or: [
          { username: trimmedUsername },
          { email: lowerEmail }
        ],
      }).select('id username email password fullname avatar status');

      if (!user) {
        return res.status(401).json(
          formatResponse.failure('Invalid username/email or password', 401)
        );
      }

      // Check password - tối ưu bằng cách verify trước khi check status
      const isPasswordMatch = await user.matchPassword(password);
      if (!isPasswordMatch) {
        return res.status(401).json(
          formatResponse.failure('Invalid username/email or password', 401)
        );
      }

      // Check if user is locked
      if (user.isLocked()) {
        return res.status(403).json(
          formatResponse.failure('Account is locked. Please contact support', 403)
        );
      }

      // Check if user is active (optional - can add pending verification check)
      if (!user.isActive()) {
        return res.status(403).json(
          formatResponse.failure('Account is not active. Please verify your email', 403)
        );
      }

      // Generate JWT token
      const token = signJwt({
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user',
      });

      res.status(200).json(
        formatResponse.success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          token,
        }, 'Login successful')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/auth/profile
   * Lấy thông tin profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json(
          formatResponse.failure('User not found', 404)
        );
      }

      res.json(
        formatResponse.success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
            bio: user.bio,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            phone: user.phone,
            status: user.status,
            createdAt: user.createdAt,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/auth/profile
   * Cập nhật profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { fullname, avatar, bio, dateOfBirth, gender, phone } = req.body;

      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json(
          formatResponse.failure('User not found', 404)
        );
      }

      // Update fields
      if (fullname !== undefined) user.fullname = fullname;
      if (avatar !== undefined) user.avatar = avatar;
      if (bio !== undefined) user.bio = bio;
      if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
      if (gender !== undefined) user.gender = gender;
      if (phone !== undefined) user.phone = phone;

      await user.save();

      res.json(
        formatResponse.success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
            bio: user.bio,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            phone: user.phone,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

