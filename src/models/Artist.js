const mongoose = require('mongoose');

const ArtistSchema = new mongoose.Schema(
  {
    artistId: { type: String, index: true },
    name: { type: String, required: true },
    bio: { type: String },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Artist', ArtistSchema);


