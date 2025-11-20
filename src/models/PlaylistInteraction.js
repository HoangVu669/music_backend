const mongoose = require("mongoose");

/**
 * PlaylistInteraction Model - Tương tác của user với playlist
 * Gộp Like và Follow vào một model
 */
const PlaylistInteractionSchema = new mongoose.Schema(
  {
    playlistId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    isLiked: {
      type: Boolean,
      default: false,
      index: true,
    },
    likedAt: { type: Date },
    isFollowed: {
      type: Boolean,
      default: false,
      index: true,
    },
    followedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "playlist_interactions",
  }
);

PlaylistInteractionSchema.index({ playlistId: 1, userId: 1 }, { unique: true });
PlaylistInteractionSchema.index({ userId: 1, isLiked: 1, likedAt: -1 });
PlaylistInteractionSchema.index({ userId: 1, isFollowed: 1, followedAt: -1 });
PlaylistInteractionSchema.index({ playlistId: 1, isLiked: 1 });
PlaylistInteractionSchema.index({ playlistId: 1, isFollowed: 1 });

module.exports = mongoose.model(
  "PlaylistInteraction",
  PlaylistInteractionSchema
);
