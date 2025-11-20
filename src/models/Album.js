const mongoose = require("mongoose");

const AlbumSchema = new mongoose.Schema(
  {
    albumId: {
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

    artistIds: [{ type: String, index: true }],

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
  },
  {
    timestamps: true,
    collection: "albums",
  }
);

// Text index với default_language để tránh lỗi language override
AlbumSchema.index({ title: "text" }, { default_language: "none" });
AlbumSchema.index({ artistIds: 1 });
AlbumSchema.index({ songCount: -1 });

module.exports = mongoose.model("Album", AlbumSchema);
