const express = require('express');
const router = express.Router();
const { query, body } = require('express-validator');
const groupController = require('../../controllers/user/groupController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const getGroupsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'stats.totalMembers']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const createGroupValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Group name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('maxMembers').optional().isInt({ min: 2, max: 100 }).withMessage('Max members must be between 2 and 100'),
  body('allowMemberAddSongs').optional().isBoolean().withMessage('allowMemberAddSongs must be a boolean'),
  body('allowMemberSkip').optional().isBoolean().withMessage('allowMemberSkip must be a boolean'),
  body('requireApproval').optional().isBoolean().withMessage('requireApproval must be a boolean')
];

const playSongValidation = [
  body('songId').isMongoId().withMessage('Valid song ID is required')
];

const sendMessageValidation = [
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters')
];

// Routes
router.get('/', getGroupsValidation, groupController.getGroups);
router.get('/my', authenticateToken, getGroupsValidation, groupController.getMyGroups);
router.get('/:id', authenticateToken, groupController.getGroupById);
router.post('/', authenticateToken, createGroupValidation, groupController.createGroup);
router.post('/:id/join', authenticateToken, groupController.joinGroup);
router.post('/:id/leave', authenticateToken, groupController.leaveGroup);
router.post('/:id/play', authenticateToken, playSongValidation, groupController.playSong);
router.post('/:id/pause', authenticateToken, groupController.pauseSong);
router.post('/:id/skip', authenticateToken, groupController.skipSong);
router.post('/:id/chat', authenticateToken, sendMessageValidation, groupController.sendMessage);

module.exports = router;
