const mongoose = require('mongoose');

const ArtistSchema = new mongoose.Schema(
  {
    artistId: { type: String, unique: true, index: true }, // zing artist id
    name: { type: String, required: true },
    bio: { type: String },
    thumbnail: { type: String },
    followerCount: { type: Number, default: 0 },
    songCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastSynced: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for better performance
ArtistSchema.index({ name: 'text' });
ArtistSchema.index({ followerCount: -1 });

module.exports = mongoose.model('Artist', ArtistSchema);


