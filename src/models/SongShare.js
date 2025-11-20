const mongoose = require("mongoose");

/**
 * SongShare Model - Quản lý share bài hát
 * Lưu thông tin user nào đã share bài hát nào
 */
const SongShareSchema = new mongoose.Schema(
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
    shareType: {
      type: String,
      enum: ["facebook", "twitter", "whatsapp", "link", "other"],
      default: "link",
    },
    sharedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "song_shares",
  }
);

SongShareSchema.index({ songId: 1, sharedAt: -1 });
SongShareSchema.index({ userId: 1, sharedAt: -1 });
SongShareSchema.index({ shareType: 1 });

module.exports = mongoose.model("SongShare", SongShareSchema);
