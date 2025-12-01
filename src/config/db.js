const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_app';

  if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/music_app') {
    console.error('Error: MONGO_URI is not set in environment variables');
    throw new Error('MONGO_URI environment variable is not set. Please set it in Vercel environment variables.');
  }

  // Nếu đã connected, return ngay
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Nếu đang connecting, đợi connection hiện tại
  if (mongoose.connection.readyState === 2) {
    if (connectionPromise) {
      return connectionPromise;
    }
  }

  // Nếu đã có promise đang chờ, return promise đó
  if (connectionPromise) {
    return connectionPromise;
  }

  // Tạo connection mới với connection pooling tối ưu
  mongoose.set('strictQuery', true);

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // 5s timeout
        socketTimeoutMS: 45000,
        maxPoolSize: 10, // Connection pool size
        minPoolSize: 2, // Giữ 2 connections sẵn sàng
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      connectionPromise = null;
      return conn;
    } catch (error) {
      connectionPromise = null;
      console.error(`MongoDB connection error: ${error.message}`);
      throw error;
    }
  })();

  return connectionPromise;
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };


