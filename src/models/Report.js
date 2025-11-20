const mongoose = require("mongoose");

/**
 * Report Model - Quản lý báo cáo vi phạm từ user
 * User report content, admin xử lý
 */
const ReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reporterId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["song", "playlist", "comment", "user", "room", "other"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "inappropriate",
        "copyright",
        "fake",
        "harassment",
        "other",
      ],
      required: true,
      index: true,
    },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: String, index: true },
    reviewedAt: { type: Date },
    resolution: { type: String },
  },
  {
    timestamps: true,
    collection: "reports",
  }
);

ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ type: 1, targetId: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reviewedBy: 1, reviewedAt: -1 });

module.exports = mongoose.model("Report", ReportSchema);
