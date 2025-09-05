const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const logController = require('../../controllers/admin/logController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getLogsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['user_action', 'system', 'error', 'security']).withMessage('Invalid log type'),
  query('level').optional().isIn(['info', 'warning', 'error', 'critical']).withMessage('Invalid log level'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

const getActivityLogsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('action').optional().isIn(['song_play', 'song_like', 'playlist_create', 'playlist_update', 'user_follow', 'user_unfollow', 'group_join', 'group_leave', 'comment_add', 'comment_delete']).withMessage('Invalid action'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

const getErrorLogsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('level').optional().isIn(['error', 'critical']).withMessage('Invalid error level'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

// Routes
router.get('/', adminAuth, getLogsValidation, logController.getSystemLogs);
router.get('/activity', adminAuth, getActivityLogsValidation, logController.getActivityLogs);
router.get('/errors', adminAuth, getErrorLogsValidation, logController.getErrorLogs);

module.exports = router;
