const mongoose = require("mongoose");

/**
 * Notification Model - Quản lý thông báo cho user
 * User nhận thông báo về like, comment, follow, share, room invite...
 */
const NotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "share",
        "room_invite",
        "playlist_update",
        "system",
        "other",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed },
    actorId: { type: String, index: true },
    targetId: { type: String },
    targetType: {
      type: String,
      enum: ["song", "playlist", "comment", "user", "room"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ actorId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
