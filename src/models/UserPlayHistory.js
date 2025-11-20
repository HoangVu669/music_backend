const mongoose = require("mongoose");

/**
 * UserPlayHistory Model - Lịch sử nghe nhạc chi tiết
 * QUAN TRỌNG cho AI recommendation - track thói quen nghe nhạc của user
 */
const UserPlayHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    songId: {
      type: String,
      required: true,
      index: true,
    },
    playedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    playDuration: {
      type: Number,
      default: 0,
    },
    playPercentage: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSkipped: {
      type: Boolean,
      default: false,
      index: true,
    },
    skipPosition: {
      type: Number,
    },
    context: {
      type: String,
      enum: [
        "home",
        "room",
        "playlist",
        "album",
        "artist",
        "search",
        "recommendation",
        "other",
      ],
      default: "other",
      index: true,
    },
    device: {
      type: String,
    },
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "user_play_history",
  }
);

// Indexes cho AI recommendation queries
UserPlayHistorySchema.index({ userId: 1, playedAt: -1 });
UserPlayHistorySchema.index({ songId: 1, playedAt: -1 });
UserPlayHistorySchema.index({ userId: 1, songId: 1, playedAt: -1 });
UserPlayHistorySchema.index({ userId: 1, isCompleted: 1, playedAt: -1 });
UserPlayHistorySchema.index({ userId: 1, timeOfDay: 1 });
UserPlayHistorySchema.index({ userId: 1, dayOfWeek: 1 });
UserPlayHistorySchema.index({ userId: 1, context: 1 });

module.exports = mongoose.model("UserPlayHistory", UserPlayHistorySchema);
