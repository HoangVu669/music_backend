const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema(
  {
    playlistId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
    },
    thumbnail: { type: String },
    description: { type: String },

    userId: { type: String, index: true },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    songIds: [{ type: String, index: true }],
    songCount: {
      type: Number,
      default: 0,
      index: true,
    },

    genres: [{ type: String, index: true }],

    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
    followCount: {
      type: Number,
      default: 0,
      index: true,
    },
    playCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "playlists",
  }
);

// Text index với default_language để tránh lỗi language override
PlaylistSchema.index({ title: "text" }, { default_language: "none" });
PlaylistSchema.index({ userId: 1, isPublic: 1 });
PlaylistSchema.index({ songCount: -1 });
PlaylistSchema.index({ likeCount: -1 });
PlaylistSchema.index({ followCount: -1 });
PlaylistSchema.index({ playCount: -1 });

module.exports = mongoose.model("Playlist", PlaylistSchema);
