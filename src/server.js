const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
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

// Initialize Socket.io
const socketService = new SocketService(server);

const PORT = process.env.PORT || 4000;

connectDatabase()
  .then(() => {
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
  })
  .catch((err) => {
    console.error('Failed to start server due to DB error', err);
    process.exit(1);
  });

module.exports = app;


