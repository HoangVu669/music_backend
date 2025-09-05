const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const { AdminAlbumController, upload } = require('../../controllers/admin/albumController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getAlbumsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isString().withMessage('Genre must be a string'),
  query('artist').optional().isMongoId().withMessage('Invalid artist ID'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('sortBy').optional().isIn(['title', 'releaseDate', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const createAlbumValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('artist').isMongoId().withMessage('Valid artist ID is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('genre').optional().trim().isLength({ max: 30 }).withMessage('Genre must be less than 30 characters'),
  body('releaseDate').optional().isISO8601().withMessage('Valid release date is required')
];

const updateAlbumValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('artist').optional().isMongoId().withMessage('Valid artist ID is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('genre').optional().trim().isLength({ max: 30 }).withMessage('Genre must be less than 30 characters'),
  body('releaseDate').optional().isISO8601().withMessage('Valid release date is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// Routes
router.get('/', adminAuth, getAlbumsValidation, AdminAlbumController.getAlbums);
router.get('/:id', adminAuth, AdminAlbumController.getAlbumById);
router.post('/', adminAuth, createAlbumValidation, AdminAlbumController.createAlbum);
router.put('/:id', adminAuth, updateAlbumValidation, AdminAlbumController.updateAlbum);
router.delete('/:id', adminAuth, AdminAlbumController.deleteAlbum);
router.post('/:id/cover', adminAuth, upload.single('cover'), AdminAlbumController.uploadCover);

module.exports = router;
