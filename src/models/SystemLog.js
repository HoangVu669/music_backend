const mongoose = require("mongoose");

/**
 * SystemLog Model - Quản lý logs hệ thống
 * Admin theo dõi hoạt động hệ thống, user, errors...
 */
const SystemLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ["user", "admin", "system"],
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "auth",
        "user",
        "song",
        "playlist",
        "artist",
        "room",
        "social",
        "system",
        "admin",
      ],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "system_logs",
  }
);

SystemLogSchema.index({ level: 1, category: 1, timestamp: -1 });
SystemLogSchema.index({ userId: 1, timestamp: -1 });
SystemLogSchema.index({ adminId: 1, timestamp: -1 });
SystemLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("SystemLog", SystemLogSchema);
