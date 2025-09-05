const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const { AdminSongController, upload } = require('../../controllers/admin/songController');
const { adminAuth } = require('../../middleware/admin');

// Validation rules
const getSongsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'other']).withMessage('Invalid genre'),
  query('isApproved').optional().isBoolean().withMessage('isApproved must be a boolean'),
  query('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  query('sortBy').optional().isIn(['createdAt', 'title', 'stats.playCount', 'stats.likeCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const createSongValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('artist').isMongoId().withMessage('Valid artist ID is required'),
  body('album').optional().trim().isLength({ max: 100 }).withMessage('Album must be less than 100 characters'),
  body('genre').isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'other']).withMessage('Invalid genre'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('lyrics').optional().trim().isLength({ max: 10000 }).withMessage('Lyrics must be less than 10000 characters'),
  body('language').optional().isIn(['vi', 'en', 'ko', 'ja', 'zh']).withMessage('Invalid language'),
  body('isExplicit').optional().isBoolean().withMessage('isExplicit must be a boolean'),
  body('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill']).withMessage('Invalid mood'),
  body('bpm').optional().isInt({ min: 60, max: 200 }).withMessage('BPM must be between 60 and 200'),
  body('key').optional().isIn(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']).withMessage('Invalid key'),
  body('tags').optional().isString().withMessage('Tags must be a string')
];

const updateSongValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('artist').optional().isMongoId().withMessage('Valid artist ID is required'),
  body('album').optional().trim().isLength({ max: 100 }).withMessage('Album must be less than 100 characters'),
  body('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'other']).withMessage('Invalid genre'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('lyrics').optional().trim().isLength({ max: 10000 }).withMessage('Lyrics must be less than 10000 characters'),
  body('language').optional().isIn(['vi', 'en', 'ko', 'ja', 'zh']).withMessage('Invalid language'),
  body('isExplicit').optional().isBoolean().withMessage('isExplicit must be a boolean'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('isApproved').optional().isBoolean().withMessage('isApproved must be a boolean'),
  body('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill']).withMessage('Invalid mood'),
  body('bpm').optional().isInt({ min: 60, max: 200 }).withMessage('BPM must be between 60 and 200'),
  body('key').optional().isIn(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']).withMessage('Invalid key'),
  body('tags').optional().isString().withMessage('Tags must be a string')
];

const rejectSongValidation = [
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters')
];

// Routes
router.get('/', adminAuth, getSongsValidation, AdminSongController.getSongs);
router.get('/:id', adminAuth, AdminSongController.getSongById);
router.post('/', adminAuth, createSongValidation, AdminSongController.createSong);
router.put('/:id', adminAuth, updateSongValidation, AdminSongController.updateSong);
router.delete('/:id', adminAuth, AdminSongController.deleteSong);
router.post('/:id/upload', adminAuth, upload.single('audio'), AdminSongController.uploadAudio);
router.post('/:id/cover', adminAuth, upload.single('cover'), AdminSongController.uploadCover);
router.put('/:id/approve', adminAuth, AdminSongController.approveSong);
router.put('/:id/reject', adminAuth, rejectSongValidation, AdminSongController.rejectSong);

module.exports = router;
