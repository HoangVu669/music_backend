const mongoose = require("mongoose");

/**
 * SongFeatures Model - Đặc trưng âm nhạc cho AI recommendation
 * Chức năng: Lưu audio features để content-based filtering (như Spotify)
 */
const SongFeaturesSchema = new mongoose.Schema(
  {
    songId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    acousticFeatures: {
      tempo: {
        type: Number, // BPM (beats per minute)
        min: 0,
        max: 300,
      },
      key: {
        type: Number, // 0 = C, 1 = C#, ..., 11 = B
        min: 0,
        max: 11,
      },
      mode: {
        type: Number, // 0 = minor, 1 = major
        enum: [0, 1],
      },
      timeSignature: {
        type: Number, // 3, 4, 5, 6, 7
        min: 3,
        max: 7,
      },
      loudness: {
        type: Number, // dB
        default: -60,
      },
      energy: {
        type: Number, // 0.0 to 1.0
        min: 0,
        max: 1,
      },
      danceability: {
        type: Number, // 0.0 to 1.0
        min: 0,
        max: 1,
      },
      valence: {
        type: Number, // 0.0 (sad) to 1.0 (happy)
        min: 0,
        max: 1,
      },
      acousticness: {
        type: Number, // 0.0 to 1.0
        min: 0,
        max: 1,
      },
      instrumentalness: {
        type: Number, // 0.0 (vocal) to 1.0 (instrumental)
        min: 0,
        max: 1,
      },
      liveness: {
        type: Number, // 0.0 to 1.0
        min: 0,
        max: 1,
      },
      speechiness: {
        type: Number, // 0.0 to 1.0
        min: 0,
        max: 1,
      },
    },
    mood: {
      type: String,
      enum: [
        "HAPPY",
        "SAD",
        "ENERGETIC",
        "CALM",
        "ROMANTIC",
        "ANGRY",
        "MELANCHOLIC",
        "UPLIFTING",
        "DARK",
        "PEACEFUL",
      ],
      index: true,
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ], // ["chill", "workout", "study", "party", "sleep"]
    language: {
      type: String,
      index: true,
    },
    era: {
      type: String,
      enum: ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"],
      index: true,
    },
    popularity: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    explicitContent: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Embedding vector cho similarity search (optional, for advanced ML)
    embedding: {
      type: [Number], // Array of floats, e.g., 128-dimension vector
      default: [],
    },
    embeddingVersion: {
      type: String, // Track which model version generated the embedding
    },
    lastAnalyzedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    analysisSource: {
      type: String,
      enum: ["MANUAL", "API", "ML_MODEL"],
      default: "MANUAL",
    },
  },
  {
    timestamps: true,
    collection: "song_features",
  }
);

SongFeaturesSchema.index({ songId: 1 });
SongFeaturesSchema.index({ mood: 1, popularity: -1 });
SongFeaturesSchema.index({ "acousticFeatures.energy": 1 });
SongFeaturesSchema.index({ "acousticFeatures.valence": 1 });
SongFeaturesSchema.index({ "acousticFeatures.danceability": 1 });
SongFeaturesSchema.index({ tags: 1 });

// Find similar songs based on acoustic features
SongFeaturesSchema.statics.findSimilar = async function (songId, limit = 10) {
  const song = await this.findOne({ songId });
  if (!song) return [];

  // Simple similarity based on key features
  // In production, use vector similarity or ML model
  const energyRange = 0.1;
  const valenceRange = 0.1;

  return this.find({
    songId: { $ne: songId },
    "acousticFeatures.energy": {
      $gte: song.acousticFeatures.energy - energyRange,
      $lte: song.acousticFeatures.energy + energyRange,
    },
    "acousticFeatures.valence": {
      $gte: song.acousticFeatures.valence - valenceRange,
      $lte: song.acousticFeatures.valence + valenceRange,
    },
  })
    .sort({ popularity: -1 })
    .limit(limit);
};

module.exports = mongoose.model("SongFeatures", SongFeaturesSchema);

