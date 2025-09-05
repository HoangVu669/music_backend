const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{ type: String }], // store Zing song ids
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', PlaylistSchema);


