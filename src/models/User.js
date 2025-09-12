const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isLocked: { type: Boolean, default: false },
    profile: {
      displayName: { type: String },
      avatar: { type: String },
      bio: { type: String },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['male', 'female', 'other'] }
    },
    preferences: {
      language: { type: String, default: 'vi' },
      theme: { type: String, default: 'light' },
      autoPlay: { type: Boolean, default: true },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      }
    },
    stats: {
      totalPlayTime: { type: Number, default: 0 }, // in seconds
      totalSongsPlayed: { type: Number, default: 0 },
      totalPlaylistsCreated: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Index for better performance
UserSchema.index({ username: 'text', email: 'text' });
UserSchema.index({ isActive: 1, role: 1 });

module.exports = mongoose.model('User', UserSchema);


