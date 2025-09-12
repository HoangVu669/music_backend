const Comment = require('../../models/Comment');
const UserInteraction = require('../../models/UserInteraction');
const { formatResponse } = require('../../utils/formatResponse');

// ===== COMMENT ON SONG =====
const commentOnSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json(formatResponse(false, 'Comment content is required', null));
    }
    
    if (content.length > 500) {
      return res.status(400).json(formatResponse(false, 'Comment is too long (max 500 characters)', null));
    }
    
    const comment = await Comment.create({
      userId,
      songId,
      content: content.trim(),
      parentCommentId: parentCommentId || null
    });
    
    // Populate user info
    await comment.populate('userId', 'username profile.displayName profile.avatar');
    
    res.status(201).json(formatResponse(true, 'Comment added successfully', comment));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to add comment', null, error.message));
  }
};

// ===== GET SONG COMMENTS =====
const getSongComments = async (req, res) => {
  try {
    const { songId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const comments = await Comment.find({
      songId,
      parentCommentId: null, // Only top-level comments
      isDeleted: false
    })
    .populate('userId', 'username profile.displayName profile.avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentCommentId: comment._id,
          isDeleted: false
        })
        .populate('userId', 'username profile.displayName profile.avatar')
        .sort({ createdAt: 1 })
        .limit(5); // Limit replies to 5 per comment
        
        return {
          ...comment.toObject(),
          replies
        };
      })
    );
    
    res.json(formatResponse(true, 'Comments retrieved successfully', {
      comments: commentsWithReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get comments', null, error.message));
  }
};

// ===== UPDATE COMMENT =====
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json(formatResponse(false, 'Comment content is required', null));
    }
    
    if (content.length > 500) {
      return res.status(400).json(formatResponse(false, 'Comment is too long (max 500 characters)', null));
    }
    
    const comment = await Comment.findOne({
      _id: commentId,
      userId,
      isDeleted: false
    });
    
    if (!comment) {
      return res.status(404).json(formatResponse(false, 'Comment not found', null));
    }
    
    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();
    
    res.json(formatResponse(true, 'Comment updated successfully', comment));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to update comment', null, error.message));
  }
};

// ===== DELETE COMMENT =====
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    const comment = await Comment.findOne({
      _id: commentId,
      userId,
      isDeleted: false
    });
    
    if (!comment) {
      return res.status(404).json(formatResponse(false, 'Comment not found', null));
    }
    
    // Soft delete
    comment.isDeleted = true;
    await comment.save();
    
    res.json(formatResponse(true, 'Comment deleted successfully', null));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to delete comment', null, error.message));
  }
};

// ===== LIKE COMMENT =====
const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json(formatResponse(false, 'Comment not found', null));
    }
    
    // Check if user already liked this comment
    const existingInteraction = await UserInteraction.findOne({
      userId,
      songId: comment.songId,
      action: 'like',
      'metadata.commentId': commentId
    });
    
    if (existingInteraction) {
      // Unlike the comment
      await UserInteraction.deleteOne({ _id: existingInteraction._id });
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      await comment.save();
      
      return res.json(formatResponse(true, 'Comment unliked successfully', { liked: false }));
    } else {
      // Like the comment
      await UserInteraction.create({
        userId,
        songId: comment.songId,
        action: 'like',
        metadata: { commentId }
      });
      
      comment.likeCount += 1;
      await comment.save();
      
      return res.json(formatResponse(true, 'Comment liked successfully', { liked: true }));
    }
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to like/unlike comment', null, error.message));
  }
};

// ===== GET USER COMMENTS =====
const getUserComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const comments = await Comment.find({
      userId,
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    res.json(formatResponse(true, 'User comments retrieved successfully', {
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get user comments', null, error.message));
  }
};

// ===== SHARE SONG =====
const shareSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;
    
    // Record share interaction
    await UserInteraction.create({
      userId,
      songId,
      action: 'share'
    });
    
    res.json(formatResponse(true, 'Song shared successfully', { songId }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to share song', null, error.message));
  }
};

// ===== GET USER ACTIVITY =====
const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const activities = await UserInteraction.find({
      userId
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    res.json(formatResponse(true, 'User activity retrieved successfully', {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get user activity', null, error.message));
  }
};

module.exports = {
  commentOnSong,
  getSongComments,
  updateComment,
  deleteComment,
  likeComment,
  getUserComments,
  shareSong,
  getUserActivity,
};