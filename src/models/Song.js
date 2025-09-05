const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema(
  {
    songId: { type: String, required: true, index: true }, // zing id
    title: { type: String, required: true },
    artist: { type: String },
    album: { type: String },
    duration: { type: Number },
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', SongSchema);


