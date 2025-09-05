const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const commentController = require('../../controllers/user/commentController');
const { authenticateToken } = require('../../middleware/auth');

// Validation rules
const updateCommentValidation = [
  body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
];

const replyValidation = [
  body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Reply must be 1-500 characters'),
  body('timestamp').optional().isInt({ min: 0 }).withMessage('Timestamp must be a positive integer')
];

// Routes
router.put('/:id', authenticateToken, updateCommentValidation, commentController.updateComment);
router.delete('/:id', authenticateToken, commentController.deleteComment);
router.post('/:id/like', authenticateToken, commentController.likeComment);
router.delete('/:id/like', authenticateToken, commentController.unlikeComment);
router.post('/:id/reply', authenticateToken, replyValidation, commentController.replyToComment);

module.exports = router;
