const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const notificationController = require('../../controllers/user/notificationController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const getNotificationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['like', 'comment', 'follow', 'group_invite', 'group_join', 'group_leave', 'song_added', 'playlist_shared', 'system']).withMessage('Invalid notification type'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean')
];

// Routes
router.get('/', authenticateToken, getNotificationsValidation, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;
