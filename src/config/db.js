const mongoose = require('mongoose');

let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

async function connectDatabase() {
  // Nếu đã connected, không cần connect lại
  if (mongoose.connection.readyState === 1) {
    console.log('Already connected to MongoDB');
    return;
  }

  // Nếu đang connecting, đợi một chút
  if (mongoose.connection.readyState === 2) {
    console.log('MongoDB connection in progress, waiting...');
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve());
      mongoose.connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_app';

  if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/music_app') {
    throw new Error('MONGO_URI environment variable is not set. Please set it in Vercel environment variables.');
  }

  mongoose.set('strictQuery', true);

  try {
    connectionAttempts++;
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    console.log('Connected to MongoDB');
    connectionAttempts = 0; // Reset on success
  } catch (error) {
    connectionAttempts = 0; // Reset attempts
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };


