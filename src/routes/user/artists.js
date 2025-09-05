const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const artistController = require('../../controllers/user/artistController');
const auth = require('../../middleware/auth');

// Validation rules
const getArtistsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isString().withMessage('Genre must be a string'),
  query('sortBy').optional().isIn(['name', 'totalFollowers', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getArtistSongsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'title', 'stats.playCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getArtistAlbumsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const zingArtistSongsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('count').optional().isInt({ min: 1, max: 50 }).withMessage('Count must be between 1 and 50')
];

// Routes
router.get('/', getArtistsValidation, artistController.getArtists);
router.get('/zing/:name', artistController.getZingArtist);
router.get('/zing/:id/songs', zingArtistSongsValidation, artistController.getZingArtistSongs);
router.get('/:id', artistController.getArtistById);
router.get('/:id/songs', getArtistSongsValidation, artistController.getArtistSongs);
router.get('/:id/albums', getArtistAlbumsValidation, artistController.getArtistAlbums);

module.exports = router;
