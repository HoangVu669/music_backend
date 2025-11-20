const mongoose = require("mongoose");

/**
 * RecommendationFeedback Model - Feedback từ user về AI recommendations
 * Chức năng: Improve ML model bằng cách học từ phản hồi của user
 */
const RecommendationFeedbackSchema = new mongoose.Schema(
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
    recommendationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserRecommendation",
      index: true,
    },
    algorithm: {
      type: String,
      enum: ["COLLABORATIVE", "CONTENT", "HYBRID", "POPULAR", "TRENDING"],
      required: true,
      index: true,
    },
    context: {
      type: String,
      enum: ["HOME", "ROOM", "PLAYLIST", "ALBUM", "ARTIST", "SEARCH", "RECOMMENDATION", "OTHER"],
      index: true,
    },
    feedbackType: {
      type: String,
      enum: [
        "PLAYED", // User played the song
        "SKIPPED", // User skipped immediately
        "COMPLETED", // User listened to completion
        "LIKED", // User liked the song
        "DISLIKED", // User explicitly disliked
        "ADDED_TO_PLAYLIST", // User added to playlist
        "IGNORED", // User saw but ignored
      ],
      required: true,
      index: true,
    },
    playDuration: {
      type: Number, // seconds played before skip/complete
      default: 0,
    },
    playPercentage: {
      type: Number, // 0-100
      default: 0,
    },
    explicitFeedback: {
      // User explicitly rated the recommendation
      rating: {
        type: Number, // 1-5 stars
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        maxlength: 500,
      },
    },
    metadata: {
      timeOfDay: {
        type: String,
        enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT"],
      },
      dayOfWeek: {
        type: String,
        enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      },
      deviceType: {
        type: String,
        enum: ["MOBILE", "TABLET", "WEB", "DESKTOP"],
      },
      recommendationScore: {
        type: Number, // Original score from recommendation algorithm
      },
      recommendationReason: {
        type: String,
      },
    },
    isPositive: {
      type: Boolean,
      default: false,
      index: true,
    }, // Derived field for easy querying
  },
  {
    timestamps: true,
    collection: "recommendation_feedbacks",
  }
);

RecommendationFeedbackSchema.index({ userId: 1, songId: 1 });
RecommendationFeedbackSchema.index({ algorithm: 1, feedbackType: 1 });
RecommendationFeedbackSchema.index({ isPositive: 1, createdAt: -1 });
RecommendationFeedbackSchema.index({ userId: 1, createdAt: -1 });

// Pre-save hook to set isPositive
RecommendationFeedbackSchema.pre("save", function (next) {
  const positiveFeedbacks = ["PLAYED", "COMPLETED", "LIKED", "ADDED_TO_PLAYLIST"];
  const negativeFeedbacks = ["SKIPPED", "DISLIKED"];

  if (positiveFeedbacks.includes(this.feedbackType)) {
    this.isPositive = true;
  } else if (negativeFeedbacks.includes(this.feedbackType)) {
    this.isPositive = false;
  } else {
    // IGNORED is neutral, use playPercentage
    this.isPositive = this.playPercentage >= 50;
  }

  next();
});

// Get feedback stats for an algorithm
RecommendationFeedbackSchema.statics.getAlgorithmStats = async function (algorithm) {
  const total = await this.countDocuments({ algorithm });
  const positive = await this.countDocuments({ algorithm, isPositive: true });
  const negative = await this.countDocuments({ algorithm, isPositive: false });

  return {
    algorithm,
    total,
    positive,
    negative,
    successRate: total > 0 ? (positive / total) * 100 : 0,
  };
};

module.exports = mongoose.model("RecommendationFeedback", RecommendationFeedbackSchema);

