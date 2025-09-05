const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

(async () => {
  try {
    const emailArg = process.argv[2];
    const newPassArg = process.argv[3];

    if (!emailArg || !newPassArg) {
      console.log('Usage: node scripts/resetUserPassword.js <email> <newPassword>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/music_api');
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: emailArg.toLowerCase() }).select('+password');
    if (!user) {
      console.error('User not found:', emailArg);
      process.exit(1);
    }

    user.password = newPassArg; // pre('save') will hash once
    await user.save();

    console.log('Password updated for:', emailArg);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
