const mongoose = require("mongoose");

/**
 * SongComment Model - Quản lý comment trên bài hát
 * Lưu comment của user trên bài hát
 */
const SongCommentSchema = new mongoose.Schema(
  {
    commentId: {
      type: String,
      required: true,
      unique: true,
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
    userName: { type: String },
    userAvatar: { type: String },
    content: {
      type: String,
      required: true,
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
    replyCount: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Number, // Timestamp in seconds for time-based comments (like YouTube)
      index: true,
    },
    parentCommentId: {
      type: String,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "song_comments",
  }
);

SongCommentSchema.index({ songId: 1, createdAt: -1 });
SongCommentSchema.index({ userId: 1, createdAt: -1 });
SongCommentSchema.index({ parentCommentId: 1 });
SongCommentSchema.index({ likeCount: -1 });
// Compound index cho query getSongComments - tối ưu performance
SongCommentSchema.index({ songId: 1, isDeleted: 1, parentCommentId: 1, createdAt: -1 });

module.exports = mongoose.model("SongComment", SongCommentSchema);
