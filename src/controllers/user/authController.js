/**
 * Auth Controller - User Authentication
 * Microservice Architecture - Standardized Response Format
 */
const User = require('../../models/User');
const { signJwt } = require('../../utils/jwt');
const { success, failure, getHttpStatus } = require('../../utils/formatResponse');
const { USER_STATUS } = require('../../models/Enum');

class AuthController {
  /**
   * POST /api/v1/user/auth/register
   * Đăng ký user mới
   * Body: { username, email, password, fullname? }
   * Response: { success: true, code: "CREATED", message: "...", data: { user, token } }
   */
  async register(req, res, next) {
    try {
      const { username, email, password, fullname } = req.body;

      // Validation - Check required fields
      if (!username || !email || !password) {
        return res.status(getHttpStatus('MISSING_REQUIRED_FIELD')).json(
          failure('MISSING_REQUIRED_FIELD', 'Username, email và password là bắt buộc')
        );
      }

      // Validation - Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(getHttpStatus('INVALID_EMAIL')).json(
          failure('INVALID_EMAIL')
        );
      }

      // Validation - Username format (alphanumeric, underscore, 3-20 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(getHttpStatus('INVALID_USERNAME')).json(
          failure('INVALID_USERNAME', 'Tên người dùng phải có từ 3-20 ký tự và chỉ chứa chữ cái, số và dấu gạch dưới')
        );
      }

      // Validation - Password strength (minimum 6 characters)
      if (password.length < 6) {
        return res.status(getHttpStatus('PASSWORD_TOO_SHORT')).json(
          failure('PASSWORD_TOO_SHORT')
        );
      }

      // Check if user already exists - tối ưu query với select chỉ id
      const lowerEmail = email.toLowerCase();
      const existingUser = await User.findOne({
        $or: [{ username }, { email: lowerEmail }],
      }).select('_id username email').lean();

      if (existingUser) {
        const responseCode = existingUser.username === username
          ? 'USERNAME_ALREADY_EXISTS'
          : 'EMAIL_ALREADY_EXISTS';
        return res.status(getHttpStatus(responseCode)).json(
          failure(responseCode)
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

      res.status(getHttpStatus('CREATED')).json(
        success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          token,
        }, 'CREATED', 'Đăng ký thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/auth/login
   * Đăng nhập
   * Body: { username (username or email), password }
   * Response: { success: true, code: "SUCCESS", message: "...", data: { user, token } }
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Validation - Check required fields
      if (!username || !password) {
        return res.status(getHttpStatus('MISSING_REQUIRED_FIELD')).json(
          failure('MISSING_REQUIRED_FIELD', 'Username (hoặc email) và password là bắt buộc')
        );
      }

      // Find user by username or email - tối ưu với $or (1 query thay vì 2)
      const trimmedUsername = username.trim();
      const lowerEmail = trimmedUsername.toLowerCase();

      // Dùng $or để tìm trong 1 query - tối ưu hơn 2 queries riêng biệt
      // Không dùng lean() vì cần methods (matchPassword, isLocked, isActive)
      const user = await User.findOne({
        $or: [
          { username: trimmedUsername },
          { email: lowerEmail }
        ]
      }).select('id username email password fullname avatar status');

      if (!user) {
        return res.status(getHttpStatus('INVALID_CREDENTIALS')).json(
          failure('INVALID_CREDENTIALS')
        );
      }

      // Check password - tối ưu bằng cách verify trước khi check status
      const isPasswordMatch = await user.matchPassword(password);
      if (!isPasswordMatch) {
        return res.status(getHttpStatus('INVALID_CREDENTIALS')).json(
          failure('INVALID_CREDENTIALS')
        );
      }

      // Check if user is locked
      if (user.isLocked()) {
        return res.status(getHttpStatus('ACCOUNT_LOCKED')).json(
          failure('ACCOUNT_LOCKED')
        );
      }

      // Check if user is active (optional - can add pending verification check)
      if (!user.isActive()) {
        return res.status(getHttpStatus('ACCOUNT_INACTIVE')).json(
          failure('ACCOUNT_INACTIVE')
        );
      }

      // Generate JWT token
      const token = signJwt({
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user',
      });

      res.status(getHttpStatus('SUCCESS')).json(
        success({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          token,
        }, 'SUCCESS', 'Đăng nhập thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/auth/profile
   * Lấy thông tin profile
   * Response: { success: true, code: "SUCCESS", message: "...", data: { user } }
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      // Select chỉ fields cần thiết
      const user = await User.findOne({ id: userId })
        .select('id username email fullname avatar bio dateOfBirth gender phone status createdAt')
        .lean();

      if (!user) {
        return res.status(getHttpStatus('USER_NOT_EXIST')).json(
          failure('USER_NOT_EXIST')
        );
      }

      res.status(getHttpStatus('SUCCESS')).json(
        success({ user }, 'SUCCESS', 'Thông tin cá nhân')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/auth/profile
   * Cập nhật profile
   * Response: { success: true, code: "UPDATED", message: "...", data: { user } }
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { fullname, avatar, bio, dateOfBirth, gender, phone } = req.body;

      // Select chỉ fields cần thiết để update
      const user = await User.findOne({ id: userId })
        .select('id username email fullname avatar bio dateOfBirth gender phone');

      if (!user) {
        return res.status(getHttpStatus('USER_NOT_EXIST')).json(
          failure('USER_NOT_EXIST')
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

      res.status(getHttpStatus('UPDATED')).json(
        success({
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
        }, 'UPDATED', 'Cập nhật thông tin thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

