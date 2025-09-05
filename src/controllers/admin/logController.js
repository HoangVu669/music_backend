const User = require('../../models/User');
const Song = require('../../models/Song');
const Playlist = require('../../models/Playlist');
const Group = require('../../models/Group');
const { validationResult } = require('express-validator');

class LogController {
  // GET /admin/logs
  async getSystemLogs(req, res) {
    try {
      const { page = 1, limit = 50, type, level, startDate, endDate } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter object
      const filter = {};
      if (type) filter.type = type;
      if (level) filter.level = level;
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // In a real application, you would query from a logs collection
      // For now, we'll return mock data
      const logs = [
        {
          id: '1',
          type: 'user_action',
          level: 'info',
          message: 'User registered successfully',
          userId: '507f1f77bcf86cd799439011',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          metadata: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0...'
          }
        },
        {
          id: '2',
          type: 'system',
          level: 'warning',
          message: 'High memory usage detected',
          timestamp: new Date('2024-01-15T10:25:00Z'),
          metadata: {
            memoryUsage: '85%',
            threshold: '80%'
          }
        },
        {
          id: '3',
          type: 'error',
          level: 'error',
          message: 'Database connection failed',
          timestamp: new Date('2024-01-15T10:20:00Z'),
          metadata: {
            error: 'Connection timeout',
            retryCount: 3
          }
        }
      ];

      // Filter logs based on query parameters
      let filteredLogs = logs;
      if (type) filteredLogs = filteredLogs.filter(log => log.type === type);
      if (level) filteredLogs = filteredLogs.filter(log => log.level === level);

      const total = filteredLogs.length;
      const paginatedLogs = filteredLogs.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: {
          logs: paginatedLogs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get system logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/logs/activity
  async getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter object
      const filter = {};
      if (userId) filter.userId = userId;
      if (action) filter.action = action;
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // In a real application, you would query from UserActivity collection
      // For now, we'll return mock data
      const activities = [
        {
          id: '1',
          userId: '507f1f77bcf86cd799439011',
          action: 'song_play',
          resourceType: 'song',
          resourceId: '507f1f77bcf86cd799439012',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          metadata: {
            songTitle: 'Example Song',
            duration: 180
          }
        },
        {
          id: '2',
          userId: '507f1f77bcf86cd799439011',
          action: 'playlist_create',
          resourceType: 'playlist',
          resourceId: '507f1f77bcf86cd799439013',
          timestamp: new Date('2024-01-15T10:25:00Z'),
          metadata: {
            playlistName: 'My Favorites'
          }
        },
        {
          id: '3',
          userId: '507f1f77bcf86cd799439014',
          action: 'user_follow',
          resourceType: 'user',
          resourceId: '507f1f77bcf86cd799439015',
          timestamp: new Date('2024-01-15T10:20:00Z'),
          metadata: {
            followedUserName: 'John Doe'
          }
        }
      ];

      // Filter activities based on query parameters
      let filteredActivities = activities;
      if (userId) filteredActivities = filteredActivities.filter(activity => activity.userId === userId);
      if (action) filteredActivities = filteredActivities.filter(activity => activity.action === action);

      const total = filteredActivities.length;
      const paginatedActivities = filteredActivities.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/logs/errors
  async getErrorLogs(req, res) {
    try {
      const { page = 1, limit = 50, level, startDate, endDate } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter object
      const filter = { level: { $in: ['error', 'critical'] } };
      if (level) filter.level = level;
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // In a real application, you would query from a logs collection
      // For now, we'll return mock data
      const errors = [
        {
          id: '1',
          level: 'error',
          message: 'Database connection timeout',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          stack: 'Error: Connection timeout\n    at Database.connect (/app/db.js:25:10)',
          metadata: {
            retryCount: 3,
            lastRetry: new Date('2024-01-15T10:29:00Z')
          }
        },
        {
          id: '2',
          level: 'critical',
          message: 'Memory leak detected',
          timestamp: new Date('2024-01-15T10:25:00Z'),
          stack: 'Error: Memory leak\n    at MemoryMonitor.check (/app/monitor.js:45:15)',
          metadata: {
            memoryUsage: '95%',
            processId: 1234
          }
        }
      ];

      // Filter errors based on query parameters
      let filteredErrors = errors;
      if (level) filteredErrors = filteredErrors.filter(error => error.level === level);

      const total = filteredErrors.length;
      const paginatedErrors = filteredErrors.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: {
          errors: paginatedErrors,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get error logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new LogController();
