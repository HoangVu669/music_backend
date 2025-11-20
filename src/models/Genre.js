const mongoose = require("mongoose");

const GenreSchema = new mongoose.Schema(
  {
    genreId: {
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
  },
  {
    timestamps: true,
    collection: "genres",
  }
);

// Text index với default_language để tránh lỗi language override
GenreSchema.index({ name: "text" }, { default_language: "none" });

module.exports = mongoose.model("Genre", GenreSchema);
