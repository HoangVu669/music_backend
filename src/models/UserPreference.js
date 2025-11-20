const mongoose = require("mongoose");

/**
 * UserPreference Model - Sở thích và thói quen nghe nhạc của user
 * QUAN TRỌNG cho AI recommendation - lưu preferences được tính toán từ lịch sử
 */
const UserPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    favoriteGenres: [
      {
        genre: { type: String, required: true },
        score: { type: Number, default: 0 },
        playCount: { type: Number, default: 0 },
        lastPlayedAt: { type: Date },
      },
    ],
    favoriteArtists: [
      {
        artistId: { type: String, required: true },
        score: { type: Number, default: 0 },
        playCount: { type: Number, default: 0 },
        lastPlayedAt: { type: Date },
      },
    ],
    favoriteAlbums: [
      {
        albumId: { type: String, required: true },
        score: { type: Number, default: 0 },
        playCount: { type: Number, default: 0 },
        lastPlayedAt: { type: Date },
      },
    ],
    preferredTimeOfDay: [
      {
        time: {
          type: String,
          enum: ["morning", "afternoon", "evening", "night"],
        },
        playCount: { type: Number, default: 0 },
      },
    ],
    preferredDayOfWeek: [
      {
        day: {
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
        },
        playCount: { type: Number, default: 0 },
      },
    ],
    preferredContext: [
      {
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
        },
        playCount: { type: Number, default: 0 },
      },
    ],
    averagePlayDuration: {
      type: Number,
      default: 0,
    },
    averagePlayPercentage: {
      type: Number,
      default: 0,
    },
    skipRate: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "user_preferences",
  }
);

UserPreferenceSchema.index({ userId: 1 });
UserPreferenceSchema.index({ "favoriteGenres.genre": 1 });
UserPreferenceSchema.index({ "favoriteArtists.artistId": 1 });
UserPreferenceSchema.index({ "favoriteAlbums.albumId": 1 });

module.exports = mongoose.model("UserPreference", UserPreferenceSchema);
