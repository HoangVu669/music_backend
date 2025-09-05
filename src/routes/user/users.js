const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const userController = require('../../controllers/user/userController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const searchValidation = [
  query('query').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const updateProfileValidation = [
  body('fullName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be 2-50 characters'),
  body('phone').optional().isMobilePhone('vi-VN').withMessage('Valid phone number is required'),
  body('avatar').optional().isURL().withMessage('Valid avatar URL is required'),
  body('social.bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('social.website').optional().isURL().withMessage('Valid website URL is required'),
  body('social.location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('social.gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  body('preferences.genres').optional().isArray().withMessage('Genres must be an array'),
  body('preferences.language').optional().isIn(['vi', 'en']).withMessage('Invalid language'),
  body('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.get('/me', authenticateToken, userController.getMyProfile);
router.put('/me', authenticateToken, updateProfileValidation, userController.updateMyProfile);
router.put('/me/password', authenticateToken, changePasswordValidation, userController.changeMyPassword);
router.get('/search', authenticateToken, searchValidation, userController.searchUsers);
router.get('/:id', authenticateToken, userController.getUserById);
router.post('/:id/follow', authenticateToken, userController.followUser);
router.delete('/:id/follow', authenticateToken, userController.unfollowUser);
router.get('/:id/followers', authenticateToken, paginationValidation, userController.getFollowers);
router.get('/:id/following', authenticateToken, paginationValidation, userController.getFollowing);

module.exports = router;
