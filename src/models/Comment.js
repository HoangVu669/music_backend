const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: String, required: true }, // zing song id
    content: { type: String, required: true },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // for replies
    likeCount: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for better performance
CommentSchema.index({ songId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });

module.exports = mongoose.model('Comment', CommentSchema);


