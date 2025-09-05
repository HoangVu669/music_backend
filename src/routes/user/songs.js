const express = require('express');
const router = express.Router();
const { query, body, param } = require('express-validator');
const songController = require('../../controllers/user/songController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const getSongsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'other']).withMessage('Invalid genre'),
  query('sortBy').optional().isIn(['createdAt', 'title', 'stats.playCount', 'stats.likeCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const commentValidation = [
  body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters'),
  body('parentComment').optional().isMongoId().withMessage('Invalid parent comment ID'),
  body('timestamp').optional().isInt({ min: 0 }).withMessage('Timestamp must be a positive integer')
];

const zingSearchValidation = [
  query('keyword').trim().isLength({ min: 1 }).withMessage('Search keyword is required')
];

// Routes
router.get('/', getSongsValidation, songController.getSongs);
router.get('/zing/:id', songController.getZingSong);
router.get('/zing/search', zingSearchValidation, songController.searchZingSongs);
router.get('/:id', songController.getSongById);
router.get('/:id/stream', authenticateToken, songController.streamSong);
router.post('/:id/like', authenticateToken, songController.likeSong);
router.delete('/:id/like', authenticateToken, songController.unlikeSong);
router.get('/:id/likes', authenticateToken, songController.getSongLikes);
router.post('/:id/comment', authenticateToken, commentValidation, songController.addComment);
router.get('/:id/comments', songController.getSongComments);

module.exports = router;
