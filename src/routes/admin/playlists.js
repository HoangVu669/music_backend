const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const playlistController = require('../../controllers/admin/playlistController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getPlaylistsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('owner').optional().isMongoId().withMessage('Invalid owner ID'),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'mixed', 'other']).withMessage('Invalid genre'),
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill', 'mixed']).withMessage('Invalid mood'),
  query('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'stats.playCount', 'stats.likeCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const featurePlaylistValidation = [
  body('isFeatured').isBoolean().withMessage('isFeatured must be a boolean')
];

// Routes
router.get('/', adminAuth, getPlaylistsValidation, playlistController.getPlaylists);
router.get('/:id', adminAuth, playlistController.getPlaylistById);
router.delete('/:id', adminAuth, playlistController.deletePlaylist);
router.put('/:id/feature', adminAuth, featurePlaylistValidation, playlistController.featurePlaylist);

module.exports = router;
