const mongoose = require("mongoose");

/**
 * UserRecommendation Model - Gợi ý bài hát cho user
 * Lưu kết quả AI recommendation để cache và cải thiện performance
 */
const UserRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    recommendations: [
      {
        songId: { type: String, required: true },
        score: { type: Number, required: true },
        reason: { type: String },
        algorithm: {
          type: String,
          enum: ["collaborative", "content", "hybrid", "popular", "trending"],
        },
        recommendedAt: { type: Date, default: Date.now },
      },
    ],
    context: {
      type: String,
      enum: ["home", "room", "playlist", "album", "artist", "search", "other"],
      default: "home",
      index: true,
    },
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    lastCalculated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "user_recommendations",
  }
);

UserRecommendationSchema.index({ userId: 1, isActive: 1 });
UserRecommendationSchema.index({ userId: 1, context: 1, timeOfDay: 1 });
UserRecommendationSchema.index({ userId: 1, lastCalculated: -1 });
UserRecommendationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("UserRecommendation", UserRecommendationSchema);
