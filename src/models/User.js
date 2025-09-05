const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isLocked: { type: Boolean, default: false },
    likedSongs: [{ type: String }], // store Zing song ids
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    followedArtists: [{ type: String }], // Zing artist ids or names
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);


