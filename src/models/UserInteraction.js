const mongoose = require('mongoose');

const UserInteractionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: String, required: true }, // zing song id
    action: { 
      type: String, 
      enum: ['like', 'play', 'share', 'download'], 
      required: true 
    },
    metadata: {
      playDuration: { type: Number }, // how long user played the song
      playCount: { type: Number, default: 1 },
      lastPlayedAt: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

// Compound index for better performance
UserInteractionSchema.index({ userId: 1, songId: 1, action: 1 });
UserInteractionSchema.index({ songId: 1, action: 1 });

module.exports = mongoose.model('UserInteraction', UserInteractionSchema);
