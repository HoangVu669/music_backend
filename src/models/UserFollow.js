const mongoose = require("mongoose");

/**
 * UserFollow Model - Quản lý follow giữa users
 * Lưu thông tin user nào follow user nào
 */
const UserFollowSchema = new mongoose.Schema(
  {
    followerId: {
      type: String,
      required: true,
      index: true,
    },
    followingId: {
      type: String,
      required: true,
      index: true,
    },
    followedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "user_follows",
  }
);

// Compound index để đảm bảo mỗi user chỉ follow một user khác một lần
UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
UserFollowSchema.index({ followerId: 1, followedAt: -1 });
UserFollowSchema.index({ followingId: 1, followedAt: -1 });

module.exports = mongoose.model("UserFollow", UserFollowSchema);
