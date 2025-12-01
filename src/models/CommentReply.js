const mongoose = require("mongoose");

/**
 * CommentReply Model - Trả lời comment (nested comments)
 * Chức năng: User reply comment của người khác
 */
const CommentReplySchema = new mongoose.Schema(
  {
    replyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    commentId: {
      type: String,
      required: true,
      index: true,
    },
    songId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userAvatar: {
      type: String,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    parentReplyId: {
      type: String,
      index: true,
    }, // For nested replies (reply to a reply)
    mentionedUserId: {
      type: String,
      index: true,
    },
    mentionedUserName: {
      type: String,
    },
    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
    likes: [
      {
        userId: { type: String, required: true },
        likedAt: { type: Date, default: Date.now },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "comment_replies",
  }
);

CommentReplySchema.index({ commentId: 1, createdAt: 1 });
CommentReplySchema.index({ userId: 1, songId: 1 });
CommentReplySchema.index({ mentionedUserId: 1 });
CommentReplySchema.index({ likeCount: -1 });
// Compound index cho query replies - tối ưu performance
CommentReplySchema.index({ commentId: 1, isDeleted: 1, createdAt: 1 });

// Soft delete reply
CommentReplySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("CommentReply", CommentReplySchema);

