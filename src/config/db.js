const mongoose = require('mongoose');

let connectionPromise = null; // Cache connection promise để tránh multiple connections đồng thời

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_app';

  // Kiểm tra MONGO_URI
  if (!mongoUri || mongoUri === 'mongodb://127.0.0.1:27017/music_app') {
    console.error('Error: MONGO_URI is not set in environment variables');
    throw new Error('MONGO_URI environment variable is not set. Please set it in Vercel environment variables.');
  }

  // Nếu đã connected, không cần connect lại
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Nếu đang connecting, đợi connection hiện tại
  if (mongoose.connection.readyState === 2) {
    if (connectionPromise) {
      return connectionPromise;
    }
    // Đợi connection hiện tại hoàn thành
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  // Nếu đã có promise đang chờ, return promise đó
  if (connectionPromise) {
    return connectionPromise;
  }

  // Tạo connection mới
  mongoose.set('strictQuery', true);

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // 5 giây - cân bằng giữa tốc độ và độ tin cậy
        maxPoolSize: 10, // Pool size cho Vercel serverless
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      connectionPromise = null; // Reset sau khi connect thành công
      return conn;
    } catch (error) {
      connectionPromise = null; // Reset khi có lỗi
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


