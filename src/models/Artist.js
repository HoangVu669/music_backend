const mongoose = require("mongoose");

const ArtistSchema = new mongoose.Schema(
  {
    artistId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    thumbnail: { type: String },

    followerCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "artists",
  }
);

// Text index với default_language để tránh lỗi language override
ArtistSchema.index({ name: "text" }, { default_language: "none" });
ArtistSchema.index({ followerCount: -1 });

module.exports = mongoose.model("Artist", ArtistSchema);
