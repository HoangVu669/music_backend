const mongoose = require("mongoose");

/**
 * RoomActivity Model - Log hoạt động trong phòng
 * Chức năng: Theo dõi ai join, leave, thêm bài hát, skip, etc.
 */
const RoomActivitySchema = new mongoose.Schema(
  {
    roomId: {
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
    activityType: {
      type: String,
      enum: [
        "USER_JOINED",
        "USER_LEFT",
        "USER_KICKED",
        "SONG_ADDED",
        "SONG_REMOVED",
        "SONG_SKIPPED",
        "SONG_STARTED",
        "SONG_ENDED",
        "PLAYBACK_PAUSED",
        "PLAYBACK_RESUMED",
        "ROOM_CREATED",
        "ROOM_CLOSED",
        "SETTINGS_CHANGED",
      ],
      required: true,
      index: true,
    },
    metadata: {
      // Flexible data based on activity type
      // SONG_ADDED: { songId, songTitle, artistName, position }
      // USER_KICKED: { reason }
      // SETTINGS_CHANGED: { setting, oldValue, newValue }
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "room_activities",
  }
);

RoomActivitySchema.index({ roomId: 1, timestamp: -1 });
RoomActivitySchema.index({ userId: 1, activityType: 1 });
RoomActivitySchema.index({ activityType: 1, timestamp: -1 });

// Static method to get recent activities for a room
RoomActivitySchema.statics.getRecentActivities = function (roomId, limit = 50) {
  return this.find({ roomId }).sort({ timestamp: -1 }).limit(limit);
};

module.exports = mongoose.model("RoomActivity", RoomActivitySchema);

