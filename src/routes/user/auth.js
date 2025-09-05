const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../../controllers/user/authController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be 2-50 characters'),
  body('phone').optional().isMobilePhone('vi-VN').withMessage('Valid phone number is required')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
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
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/me', authenticateToken, updateProfileValidation, authController.updateProfile);
router.put('/me/password', authenticateToken, changePasswordValidation, authController.changePassword);

module.exports = router;
