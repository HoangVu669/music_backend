const Notification = require('../../models/Notification');
const { validationResult } = require('express-validator');

class UserNotificationController {
  // GET /notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, type, isRead } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter
      const filter = { 
        user: userId, 
        isDeleted: false,
        expiresAt: { $gt: new Date() }
      };
      
      if (type) filter.type = type;
      if (isRead !== undefined) filter.isRead = isRead === 'true';

      const notifications = await Notification.find(filter)
        .populate('data.fromUserId', 'fullName avatar')
        .populate('data.songId', 'title coverImage')
        .populate('data.playlistId', 'name coverImage')
        .populate('data.groupId', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /notifications/{id}/read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOne({
        _id: id,
        user: userId,
        isDeleted: false
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /notifications/read-all
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId;

      await Notification.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /notifications/{id}
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOne({
        _id: id,
        user: userId,
        isDeleted: false
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.markAsDeleted();

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /notifications/unread-count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;

      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserNotificationController();
