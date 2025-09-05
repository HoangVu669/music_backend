const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const playlistController = require('../../controllers/user/playlistController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const getPlaylistsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('owner').optional().isMongoId().withMessage('Invalid owner ID'),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'mixed', 'other']).withMessage('Invalid genre'),
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill', 'mixed']).withMessage('Invalid mood'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'stats.playCount', 'stats.likeCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const createPlaylistValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Playlist name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('coverImage').optional().isURL().withMessage('Valid cover image URL is required'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'mixed', 'other']).withMessage('Invalid genre'),
  body('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill', 'mixed']).withMessage('Invalid mood'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const updatePlaylistValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Playlist name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('coverImage').optional().isURL().withMessage('Valid cover image URL is required'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'mixed', 'other']).withMessage('Invalid genre'),
  body('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill', 'mixed']).withMessage('Invalid mood'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

const addSongValidation = [
  body('songId').isMongoId().withMessage('Valid song ID is required')
];

const sharePlaylistValidation = [
  body('isPublic').isBoolean().withMessage('isPublic must be a boolean')
];

// Routes
router.get('/', getPlaylistsValidation, playlistController.getPlaylists);
router.get('/my', authenticateToken, getPlaylistsValidation, playlistController.getMyPlaylists);
router.get('/:id', authenticateToken, playlistController.getPlaylistById);
router.post('/', authenticateToken, createPlaylistValidation, playlistController.createPlaylist);
router.put('/:id', authenticateToken, updatePlaylistValidation, playlistController.updatePlaylist);
router.delete('/:id', authenticateToken, playlistController.deletePlaylist);
router.post('/:id/songs', authenticateToken, addSongValidation, playlistController.addSongToPlaylist);
router.delete('/:id/songs/:songId', authenticateToken, playlistController.removeSongFromPlaylist);
router.post('/:id/share', authenticateToken, sharePlaylistValidation, playlistController.sharePlaylist);

module.exports = router;
