const mongoose = require("mongoose");

/**
 * SongLike Model - Quản lý like bài hát
 * Lưu thông tin user nào đã like bài hát nào
 */
const SongLikeSchema = new mongoose.Schema(
  {
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
    likedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "song_likes",
  }
);

// Compound index để đảm bảo mỗi user chỉ like một bài hát một lần
SongLikeSchema.index({ songId: 1, userId: 1 }, { unique: true });
SongLikeSchema.index({ userId: 1, likedAt: -1 });
SongLikeSchema.index({ songId: 1, likedAt: -1 });

module.exports = mongoose.model("SongLike", SongLikeSchema);
