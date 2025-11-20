const mongoose = require("mongoose");

/**
 * UserBlock Model - Chặn người dùng
 * Chức năng: User chặn người khác (không thấy comment, không join room)
 */
const UserBlockSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    blockedUserId: {
      type: String,
      required: true,
      index: true,
    },
    blockedUserName: {
      type: String,
      required: true,
    },
    blockedUserAvatar: {
      type: String,
    },
    reason: {
      type: String,
      enum: ["SPAM", "HARASSMENT", "INAPPROPRIATE", "OTHER"],
      index: true,
    },
    note: {
      type: String,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    unblockedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "user_blocks",
  }
);

CommentReplySchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });
UserBlockSchema.index({ userId: 1, isActive: 1 });
UserBlockSchema.index({ blockedUserId: 1, isActive: 1 });

// Check if user A blocked user B
UserBlockSchema.statics.isBlocked = async function (userId, targetUserId) {
  const block = await this.findOne({
    userId,
    blockedUserId: targetUserId,
    isActive: true,
  });
  return !!block;
};

// Check if users blocked each other (mutual block)
UserBlockSchema.statics.isMutualBlock = async function (userAId, userBId) {
  const blockA = await this.isBlocked(userAId, userBId);
  const blockB = await this.isBlocked(userBId, userAId);
  return blockA && blockB;
};

// Unblock user
UserBlockSchema.methods.unblock = function () {
  this.isActive = false;
  this.unblockedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("UserBlock", UserBlockSchema);

