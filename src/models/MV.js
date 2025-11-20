const mongoose = require("mongoose");

const MVSchema = new mongoose.Schema(
  {
    mvId: {
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

    videoUrl: {
      type: String,
      required: true,
    },

    artistIds: [{ type: String, index: true }],

    songId: { type: String, index: true },

    duration: { type: Number },

    viewCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "mvs",
  }
);

// Text index với default_language để tránh lỗi language override
MVSchema.index({ title: "text" }, { default_language: "none" });
MVSchema.index({ artistIds: 1 });
MVSchema.index({ songId: 1 });
MVSchema.index({ viewCount: -1 });

module.exports = mongoose.model("MV", MVSchema);
