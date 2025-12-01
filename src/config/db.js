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

  // Tạo connection mới với connection pooling tối ưu cho serverless
  mongoose.set('strictQuery', true);

  connectionPromise = (async () => {
    try {
      const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: isVercel ? 3000 : 5000, // Giảm timeout cho serverless
        socketTimeoutMS: 45000,
        // Tối ưu cho serverless: giảm pool size để tránh connection limit
        maxPoolSize: isVercel ? 5 : 10,
        minPoolSize: isVercel ? 0 : 2, // Không giữ connection khi serverless (sẽ reconnect)
        maxIdleTimeMS: isVercel ? 10000 : 30000, // Giảm idle time cho serverless
        heartbeatFrequencyMS: isVercel ? 5000 : 10000, // Tăng tần suất heartbeat
        // Tối ưu cho serverless: retry
        retryWrites: true,
        retryReads: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host} (${isVercel ? 'Serverless' : 'Standard'} mode)`);
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


