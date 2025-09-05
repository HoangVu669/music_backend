const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const userController = require('../../controllers/admin/userController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'artist', 'admin']).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('sortBy').optional().isIn(['createdAt', 'fullName', 'email', 'lastLogin']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const banUserValidation = [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer')
];

// Routes
router.get('/', adminAuth, getUsersValidation, userController.getUsers);
router.get('/:id', adminAuth, userController.getUserById);
router.get('/:id/activity', adminAuth, userController.getUserActivity);
router.delete('/:id', adminAuth, userController.deleteUser);
router.put('/:id/ban', adminAuth, banUserValidation, userController.banUser);
router.put('/:id/unban', adminAuth, userController.unbanUser);

module.exports = router;
