const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/database');
const responseStandardizer = require('./middleware/response');

// Import routes
// User routes
const userAuthRoutes = require('./routes/user/auth');
const userRoutes = require('./routes/user/users');
const userSongRoutes = require('./routes/user/songs');
const userArtistRoutes = require('./routes/user/artists');
const userAlbumRoutes = require('./routes/user/albums');
const userPlaylistRoutes = require('./routes/user/playlists');
const userGroupRoutes = require('./routes/user/groups');
const userNotificationRoutes = require('./routes/user/notifications');
const userCommentRoutes = require('./routes/user/comments');

// Admin routes
const adminAuthRoutes = require('./routes/admin/auth');
const adminUserRoutes = require('./routes/admin/users');
const adminSongRoutes = require('./routes/admin/songs');
const adminArtistRoutes = require('./routes/admin/artists');
const adminAlbumRoutes = require('./routes/admin/albums');
const adminPlaylistRoutes = require('./routes/admin/playlists');
const adminReportRoutes = require('./routes/admin/reports');
const adminLogRoutes = require('./routes/admin/logs');

// Legacy routes - removed zingRoutes (integrated into individual controllers)

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(responseStandardizer());

app.use('/public', express.static('public'));

// User API routes
app.use('/api/auth', userAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/songs', userSongRoutes);
app.use('/api/artists', userArtistRoutes);
app.use('/api/albums', userAlbumRoutes);
app.use('/api/playlists', userPlaylistRoutes);
app.use('/api/groups', userGroupRoutes);
app.use('/api/notifications', userNotificationRoutes);
app.use('/api/comments', userCommentRoutes);

// Admin API routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/songs', adminSongRoutes);
app.use('/api/admin/artists', adminArtistRoutes);
app.use('/api/admin/albums', adminAlbumRoutes);
app.use('/api/admin/playlists', adminPlaylistRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/logs', adminLogRoutes);

// Legacy routes - zingRoutes removed (integrated into individual controllers)

app.get('/health', (req, res) => {
  return res.apiSuccess('Music API is running', { timestamp: new Date().toISOString() });
});

app.use('*', (req, res) => {
  return res.apiError('Route not found', 'NOT_FOUND');
});

app.use((error, req, res, next) => {
  console.error('Global error:', error);
  return res.apiError(error.message || 'Internal server error', 'INTERNAL_ERROR');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Music API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
}); 