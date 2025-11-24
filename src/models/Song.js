const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema(
  {
    songId: {
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

    artistIds: [{ type: String, index: true }],
    artistsNames: { type: String }, // Tên nghệ sĩ (string), cho display

    albumId: { type: String, index: true },

    duration: {
      type: Number,
      required: true,
    },
    thumbnail: { type: String },


    lyric: { type: String },
    hasLyric: {
      type: Boolean,
      default: false,
      index: true,
    },

    genres: [{ type: String, index: true }],

    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
    listenCount: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
      index: true,
    },
    shareCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "songs",
  }
);

// Text index với default_language để tránh lỗi language override
SongSchema.index({ title: "text" }, { default_language: "none" });
SongSchema.index({ artistIds: 1 });
SongSchema.index({ albumId: 1 });
SongSchema.index({ genres: 1 });
SongSchema.index({ likeCount: -1, listenCount: -1 });

module.exports = mongoose.model("Song", SongSchema);
