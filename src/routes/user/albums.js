const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const albumController = require('../../controllers/user/albumController');
const auth = require('../../middleware/auth');

// Validation rules
const getAlbumsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isString().withMessage('Genre must be a string'),
  query('artist').optional().isMongoId().withMessage('Invalid artist ID'),
  query('sortBy').optional().isIn(['title', 'releaseDate', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getAlbumSongsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Routes
router.get('/', getAlbumsValidation, albumController.getAlbums);
router.get('/zing/:id', albumController.getZingAlbum);
router.get('/:id', albumController.getAlbumById);
router.get('/:id/songs', getAlbumSongsValidation, albumController.getAlbumSongs);

module.exports = router;
