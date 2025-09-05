const User = require('../../models/User');
const Follow = require('../../models/Follow');
const { validationResult } = require('express-validator');

class UserController {
  // GET /users/{id}
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      const user = await User.findById(id).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if current user is following this user
      let isFollowing = false;
      if (currentUserId) {
        const follow = await Follow.findOne({
          follower: currentUserId,
          following: id
        });
        isFollowing = !!follow;
      }

      res.json({
        success: true,
        data: {
          ...user.toObject(),
          isFollowing
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /users/search?query=
  async searchUsers(req, res) {
    try {
      const { query, page = 1, limit = 20 } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const users = await User.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { fullName: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ fullName: 1 });

      const total = await User.countDocuments({
        $and: [
          { isActive: true },
          {
            $or: [
              { fullName: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /users/{id}/follow
  async followUser(req, res) {
    try {
      const { id } = req.params;
      const followerId = req.user.userId;

      if (followerId === id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot follow yourself'
        });
      }

      // Check if user exists
      const userToFollow = await User.findById(id);
      if (!userToFollow) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already following
      const existingFollow = await Follow.findOne({
        follower: followerId,
        following: id
      });

      if (existingFollow) {
        return res.status(400).json({
          success: false,
          message: 'Already following this user'
        });
      }

      // Create follow relationship
      const follow = new Follow({
        follower: followerId,
        following: id
      });

      await follow.save();

      // Update follower counts
      await User.findByIdAndUpdate(followerId, {
        $inc: { 'stats.totalFollowing': 1 }
      });

      await User.findByIdAndUpdate(id, {
        $inc: { 'stats.totalFollowers': 1 }
      });

      res.status(201).json({
        success: true,
        message: 'User followed successfully'
      });
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /users/{id}/follow
  async unfollowUser(req, res) {
    try {
      const { id } = req.params;
      const followerId = req.user.userId;

      // Check if follow relationship exists
      const follow = await Follow.findOne({
        follower: followerId,
        following: id
      });

      if (!follow) {
        return res.status(400).json({
          success: false,
          message: 'Not following this user'
        });
      }

      // Remove follow relationship
      await Follow.findByIdAndDelete(follow._id);

      // Update follower counts
      await User.findByIdAndUpdate(followerId, {
        $inc: { 'stats.totalFollowing': -1 }
      });

      await User.findByIdAndUpdate(id, {
        $inc: { 'stats.totalFollowers': -1 }
      });

      res.json({
        success: true,
        message: 'User unfollowed successfully'
      });
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /users/{id}/followers
  async getFollowers(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const followers = await Follow.find({ following: id })
        .populate('follower', 'fullName avatar email stats')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ followedAt: -1 });

      const total = await Follow.countDocuments({ following: id });

      res.json({
        success: true,
        data: {
          followers: followers.map(f => f.follower),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /users/{id}/following
  async getFollowing(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const following = await Follow.find({ follower: id })
        .populate('following', 'fullName avatar email stats')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ followedAt: -1 });

      const total = await Follow.countDocuments({ follower: id });

      res.json({
        success: true,
        data: {
          following: following.map(f => f.following),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /users/me
  async getMyProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const user = await User.findById(userId).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /users/me
  async updateMyProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user?.userId || req.user?.id;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;
      delete updateData.role;
      delete updateData.isActive;
      delete updateData.verificationToken;
      delete updateData.resetPasswordToken;
      delete updateData.resetPasswordExpires;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /users/me/password
  async changeMyPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user?.userId || req.user?.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserController();
