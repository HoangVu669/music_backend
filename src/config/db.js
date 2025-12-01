const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_app';

  if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/music_app') {
    console.error('Error: MONGO_URI is not set in environment variables');
    throw new Error('MONGO_URI environment variable is not set. Please set it in Vercel environment variables.');
  }

  // Nếu đã connected, không cần connect lại
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000, // Giữ timeout mặc định 15s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };


