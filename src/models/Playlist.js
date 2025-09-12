const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{ 
      songId: { type: String, required: true }, // zing song id
      addedAt: { type: Date, default: Date.now }
    }],
    isPublic: { type: Boolean, default: false },
    thumbnail: { type: String },
    playCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for better performance
PlaylistSchema.index({ userId: 1, isActive: 1 });
PlaylistSchema.index({ isPublic: 1, likeCount: -1 });

module.exports = mongoose.model('Playlist', PlaylistSchema);


