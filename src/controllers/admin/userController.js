const User = require('../../models/User');
const Song = require('../../models/Song');
const Playlist = require('../../models/Playlist');
const { validationResult } = require('express-validator');

class AdminUserController {
  // GET /admin/users
  async getUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        role, 
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = {};
      
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$text = { $search: search };
      }

      const users = await User.find(filter)
        .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await User.countDocuments(filter);

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
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/users/{id}
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's stats
      const userStats = {
        totalSongs: await Song.countDocuments({ artist: id, isPublic: true }),
        totalPlaylists: await Playlist.countDocuments({ owner: id }),
        totalPlayTime: user.stats.totalPlayTime,
        totalSongsPlayed: user.stats.totalSongsPlayed
      };

      res.json({
        success: true,
        data: {
          user,
          stats: userStats
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

  // DELETE /admin/users/{id}
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent admin from deleting themselves
      if (id === adminId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Soft delete user
      user.isActive = false;
      user.deletedAt = new Date();
      user.deletedBy = adminId;
      user.deleteReason = 'Deleted by admin';
      await user.save();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/users/{id}/ban
  async banUser(req, res) {
    try {
      const { id } = req.params;
      const { reason, duration } = req.body;
      const adminId = req.user.userId;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent admin from banning themselves
      if (id === adminId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot ban your own account'
        });
      }

      // Ban user
      user.isActive = false;
      user.blockedAt = new Date();
      user.blockedBy = adminId;
      user.blockReason = reason || 'Banned by admin';

      // Set ban duration if provided (in days)
      if (duration && duration > 0) {
        const unbanDate = new Date();
        unbanDate.setDate(unbanDate.getDate() + duration);
        user.unbanAt = unbanDate;
      }

      await user.save();

      res.json({
        success: true,
        message: 'User banned successfully',
        data: {
          blockedAt: user.blockedAt,
          blockReason: user.blockReason,
          unbanAt: user.unbanAt
        }
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/users/{id}/unban
  async unbanUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Unban user
      user.isActive = true;
      user.blockedAt = null;
      user.blockedBy = null;
      user.blockReason = null;
      user.unbanAt = null;
      await user.save();

      res.json({
        success: true,
        message: 'User unbanned successfully'
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/users/{id}/activity
  async getUserActivity(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get user's recent activity
      const recentSongs = await Song.find({ artist: id })
        .select('title createdAt isPublic isApproved')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentPlaylists = await Playlist.find({ owner: id })
        .select('name createdAt isPublic')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          recentSongs,
          recentPlaylists
        }
      });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AdminUserController();
