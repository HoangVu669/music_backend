const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema(
  {
    songId: { type: String, required: true, unique: true, index: true }, // zing id
    title: { type: String, required: true },
    artist: { type: String },
    artistId: { type: String }, // zing artist id
    album: { type: String },
    albumId: { type: String }, // zing album id
    duration: { type: Number },
    thumbnail: { type: String },
    streamingUrl: { type: String }, // cached streaming url
    streamingUrlExpiry: { type: Date }, // when streaming url expires
    likeCount: { type: Number, default: 0 },
    playCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }, // for soft delete
    lastSynced: { type: Date, default: Date.now }, // when last synced with zing
  },
  { timestamps: true }
);

// Index for better performance
SongSchema.index({ title: 'text', artist: 'text' });
SongSchema.index({ lastSynced: 1 });

module.exports = mongoose.model('Song', SongSchema);


