const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('./config/db');
const { errorMiddleware } = require('./middlewares/errorMiddleware');
const { loggerMiddleware } = require('./middlewares/loggerMiddleware');
const Admin = require('./models/Admin');
const { hashPassword } = require('./utils/bcrypt');
const SocketService = require('./services/socketService');

const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const zingRoutes = require('./routes/zingmp3');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(loggerMiddleware);

app.get('/health', async (req, res) => {
  try {
    // Kiểm tra database connection
    const dbStatus = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

    if (dbStatus === 0 && process.env.VERCEL) {
      // Nếu chưa connect và đang ở Vercel, thử connect
      try {
        await connectDatabase();
      } catch (err) {
        return res.status(500).json({
          status: 'error',
          message: 'Database connection failed',
          error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
        });
      }
    }

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      database: dbStatus === 1 ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : error.stack
    });
  }
});

// API Routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/zing', zingRoutes); // ZingMp3 direct API (internal)

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Make sure you are using the correct base path: /api/v1/user or /api/v1/admin'
  });
});

app.use(errorMiddleware);

// Initialize Socket.io (chỉ khi không phải Vercel serverless)
let socketService = null;
if (!process.env.VERCEL) {
  socketService = new SocketService(server);
}

const PORT = process.env.PORT || 4000;

// Function to start server (for local development)
async function startServer() {
  try {
    await connectDatabase();

    // seed super admin if not exists
    (async () => {
      const existing = await Admin.findOne({ username: 'admin' });
      if (!existing) {
        const passwordHash = await hashPassword('123456');
        await Admin.create({
          adminId: `admin_${Date.now()}`,
          username: 'admin',
          email: 'admin@musicapp.com',
          passwordHash,
          role: 'super_admin'
        });
        console.log('Seeded super admin: admin / 123456');
      }
    })().catch((err) => console.error('Admin seed error', err));

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`🔌 Socket.io server ready for real-time connections`);
    });
  } catch (err) {
    console.error('Failed to start server due to DB error', err);
    process.exit(1);
  }
}

// For Vercel: export app and connect DB on cold start
// For local: start server normally
if (process.env.VERCEL) {
  // Vercel serverless: connect DB and export app
  // Note: DB connection sẽ được thực hiện khi function được invoke lần đầu
  // Không connect ngay ở đây vì có thể gây timeout
  module.exports = app;
} else {
  // Local development: start server
  startServer();
  module.exports = app;
}


