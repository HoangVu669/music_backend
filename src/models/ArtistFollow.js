const mongoose = require("mongoose");

/**
 * ArtistFollow Model - User follow artist
 */
const ArtistFollowSchema = new mongoose.Schema(
  {
    artistId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    followedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "artist_follows",
  }
);

ArtistFollowSchema.index({ artistId: 1, userId: 1 }, { unique: true });
ArtistFollowSchema.index({ userId: 1, followedAt: -1 });
ArtistFollowSchema.index({ artistId: 1, followedAt: -1 });

module.exports = mongoose.model("ArtistFollow", ArtistFollowSchema);
