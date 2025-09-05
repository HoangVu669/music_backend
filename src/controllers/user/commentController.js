const Comment = require('../../models/Comment');
const Song = require('../../models/Song');
const { validationResult } = require('express-validator');

class UserCommentController {
  // DELETE /comments/{id}
  async deleteComment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const comment = await Comment.findOne({
        _id: id,
        user: userId,
        isDeleted: false
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Soft delete the comment
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      await comment.save();

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /comments/{id}
  async updateComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      const comment = await Comment.findOne({
        _id: id,
        user: userId,
        isDeleted: false
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();
      await comment.save();

      res.json({
        success: true,
        message: 'Comment updated successfully',
        data: comment
      });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /comments/{id}/like
  async likeComment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const comment = await Comment.findById(id);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      await comment.addLike(userId);
      await comment.save();

      res.json({
        success: true,
        message: 'Comment liked successfully'
      });
    } catch (error) {
      console.error('Like comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /comments/{id}/like
  async unlikeComment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const comment = await Comment.findById(id);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      await comment.removeLike(userId);
      await comment.save();

      res.json({
        success: true,
        message: 'Comment unliked successfully'
      });
    } catch (error) {
      console.error('Unlike comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /comments/{id}/reply
  async replyToComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { content, timestamp } = req.body;
      const userId = req.user.userId;

      const parentComment = await Comment.findById(id);
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }

      const reply = new Comment({
        content,
        user: userId,
        song: parentComment.song,
        parentComment: id,
        timestamp
      });

      await reply.save();

      // Add reply to parent comment
      parentComment.replies.push(reply._id);
      await parentComment.save();

      // Populate user info
      await reply.populate('user', 'fullName avatar');

      res.status(201).json({
        success: true,
        message: 'Reply added successfully',
        data: reply
      });
    } catch (error) {
      console.error('Reply to comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserCommentController();
