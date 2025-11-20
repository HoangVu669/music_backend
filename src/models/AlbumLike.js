const mongoose = require("mongoose");

/**
 * AlbumLike Model - Quản lý like album
 * Lưu thông tin user nào đã like album nào
 */
const AlbumLikeSchema = new mongoose.Schema(
  {
    albumId: {
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
    collection: "album_likes",
  }
);

// Compound index để đảm bảo mỗi user chỉ like một album một lần
AlbumLikeSchema.index({ albumId: 1, userId: 1 }, { unique: true });
AlbumLikeSchema.index({ userId: 1, likedAt: -1 });
AlbumLikeSchema.index({ albumId: 1, likedAt: -1 });

module.exports = mongoose.model("AlbumLike", AlbumLikeSchema);

