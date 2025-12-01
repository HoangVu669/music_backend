const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();

const { connectDatabase, isDatabaseConnected } = require('./config/db');
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
app.use(express.json({ limit: '10mb' })); // Giới hạn body size
app.use(cookieParser());

// Tắt morgan trong production để tăng tốc độ
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(loggerMiddleware);

// Database middleware - đảm bảo DB connected trước mỗi request (tối ưu cho Vercel)
app.use(async (req, res, next) => {
  // Skip health check và static files
  if (req.path === '/health' || req.path.startsWith('/_next') || req.path.startsWith('/static')) {
    return next();
  }

  // Chỉ connect nếu chưa connected - tối ưu cho serverless
  if (!isDatabaseConnected()) {
    try {
      // Set timeout để tránh block quá lâu
      const connectPromise = connectDatabase();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 3000)
      );
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      console.error('Database connection error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message,
      });
    }
  }
  next();
});

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    // Kiểm tra database connection
    if (!isDatabaseConnected()) {
      // Nếu chưa connect, thử connect (đặc biệt quan trọng cho Vercel cold start)
      try {
        await connectDatabase();
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'error';
        dbError = err.message;
        console.error('Health check: Database connection failed:', err.message);
      }
    } else {
      dbStatus = 'connected';
    }

    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'error',
      uptime: process.uptime(),
      database: dbStatus,
      databaseError: dbError,
      environment: process.env.NODE_ENV || 'development',
      mongoUriSet: !!process.env.MONGO_URI,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : error.stack,
      database: dbStatus,
      databaseError: dbError,
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

// For Vercel: export app and pre-connect DB để giảm cold start
// For local: start server normally
if (process.env.VERCEL) {
  // Pre-connect DB ngay khi module load (không block)
  connectDatabase().catch(() => {
    // Ignore error, sẽ retry khi có request
  });
  module.exports = app;
} else {
  // Local development: start server
  startServer();
  module.exports = app;
}


