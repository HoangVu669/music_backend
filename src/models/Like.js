const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  likedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one like per user per song
likeSchema.index({ user: 1, song: 1 }, { unique: true });
likeSchema.index({ song: 1, likedAt: -1 });
likeSchema.index({ user: 1, likedAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
