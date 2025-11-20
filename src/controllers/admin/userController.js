/**
 * Admin User Controller
 */
const User = require('../../models/User');
const formatResponse = require('../../utils/formatResponse');
const { USER_STATUS } = require('../../models/Enum');

class AdminUserController {
  async listUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullname: { $regex: search, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .select('-password -activationCode -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json(formatResponse.success({ users, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const { username, email, password, fullname } = req.body;
      const user = await User.create({ username, email, password, fullname });
      res.status(201).json(formatResponse.success({ user }));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id }).select('-password');
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      res.json(formatResponse.success({ user }));
    } catch (error) {
      next(error);
    }
  }

  async updateUserById(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id });
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      Object.assign(user, req.body);
      await user.save();
      res.json(formatResponse.success({ user }));
    } catch (error) {
      next(error);
    }
  }

  async deleteUserById(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id });
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      await User.deleteOne({ id: req.params.id });
      res.json(formatResponse.success({ deleted: true }));
    } catch (error) {
      next(error);
    }
  }

  async lockUser(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id });
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      user.status = USER_STATUS.LOCKED;
      await user.save();
      res.json(formatResponse.success({ user }));
    } catch (error) {
      next(error);
    }
  }

  async unlockUser(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id });
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      user.status = USER_STATUS.ACTIVE;
      await user.save();
      res.json(formatResponse.success({ user }));
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const user = await User.findOne({ id: req.params.id });
      if (!user) return res.status(404).json(formatResponse.failure('User not found', 404));
      const { newPassword } = req.body;
      user.password = newPassword;
      await user.save();
      res.json(formatResponse.success({ message: 'Password reset successfully' }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminUserController();

