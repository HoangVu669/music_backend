const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../../controllers/admin/authController');
const { adminAuth } = require('../../middleware/admin');

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
  body('avatar').optional().isURL().withMessage('Valid avatar URL is required')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/register', adminAuth, registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', adminAuth, authController.logout);
router.get('/me', adminAuth, authController.getProfile);
router.put('/me', adminAuth, updateProfileValidation, authController.updateProfile);
router.put('/me/password', adminAuth, changePasswordValidation, authController.changePassword);

module.exports = router;
