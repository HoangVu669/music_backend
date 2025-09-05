const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one follow relationship per pair
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ follower: 1, followedAt: -1 });
followSchema.index({ following: 1, followedAt: -1 });

// Prevent self-following
followSchema.pre('save', function(next) {
  if (this.follower.toString() === this.following.toString()) {
    const error = new Error('Cannot follow yourself');
    error.statusCode = 400;
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Follow', followSchema);
