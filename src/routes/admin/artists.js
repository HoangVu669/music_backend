const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const { AdminArtistController, upload } = require('../../controllers/admin/artistController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getArtistsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isString().withMessage('Genre must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('sortBy').optional().isIn(['name', 'totalFollowers', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const createArtistValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must be less than 1000 characters'),
  body('country').optional().trim().isLength({ max: 50 }).withMessage('Country must be less than 50 characters'),
  body('genres').optional().isString().withMessage('Genres must be a string')
];

const updateArtistValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio must be less than 1000 characters'),
  body('country').optional().trim().isLength({ max: 50 }).withMessage('Country must be less than 50 characters'),
  body('genres').optional().isString().withMessage('Genres must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// Routes
router.get('/', adminAuth, getArtistsValidation, AdminArtistController.getArtists);
router.get('/:id', adminAuth, AdminArtistController.getArtistById);
router.post('/', adminAuth, createArtistValidation, AdminArtistController.createArtist);
router.put('/:id', adminAuth, updateArtistValidation, AdminArtistController.updateArtist);
router.delete('/:id', adminAuth, AdminArtistController.deleteArtist);
router.post('/:id/avatar', adminAuth, upload.single('avatar'), AdminArtistController.uploadAvatar);

module.exports = router;
