const mongoose = require('mongoose');

const UserFollowSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    artistId: { type: String, required: true }, // zing artist id
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate follows
UserFollowSchema.index({ userId: 1, artistId: 1 }, { unique: true });
UserFollowSchema.index({ artistId: 1, isActive: 1 });

module.exports = mongoose.model('UserFollow', UserFollowSchema);
