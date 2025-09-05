const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'play_song',
      'pause_song',
      'stop_song',
      'like_song',
      'unlike_song',
      'add_to_playlist',
      'remove_from_playlist',
      'create_playlist',
      'delete_playlist',
      'follow_artist',
      'unfollow_artist',
      'download_song',
      'share_song',
      'search_query',
      'login',
      'logout',
      'register',
      'update_profile',
      'change_password',
      'upgrade_subscription',
      'cancel_subscription'
    ]
  },
  targetType: {
    type: String,
    enum: ['song', 'playlist', 'user', 'album', 'artist', 'search', 'system'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType',
    required: false
  },
  metadata: {
    // For song plays
    songTitle: String,
    artistName: String,
    duration: Number,
    playTime: Number, // How long user actually played
    
    // For search queries
    searchTerm: String,
    searchResults: Number,
    
    // For playlist actions
    playlistName: String,
    
    // For subscription changes
    oldPlan: String,
    newPlan: String,
    amount: Number,
    
    // For device info
    deviceType: String,
    userAgent: String,
    ipAddress: String,
    
    // For location (if available)
    location: {
      country: String,
      city: String,
      timezone: String
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: String, // To group activities in a session
  isCompleted: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
userActivitySchema.index({ user: 1, timestamp: -1 });
userActivitySchema.index({ action: 1, timestamp: -1 });
userActivitySchema.index({ targetType: 1, targetId: 1 });
userActivitySchema.index({ sessionId: 1 });

// Static method to get user listening history
userActivitySchema.statics.getListeningHistory = function(userId, limit = 50) {
  return this.find({
    user: userId,
    action: { $in: ['play_song', 'pause_song', 'stop_song'] },
    targetType: 'song'
  })
  .populate('targetId', 'title artist coverImage duration')
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to get user activity summary
userActivitySchema.statics.getUserActivitySummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
};

// Static method to get popular songs (based on play count)
userActivitySchema.statics.getPopularSongs = function(days = 7, limit = 20) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        action: 'play_song',
        targetType: 'song',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$targetId',
        playCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        songId: '$_id',
        playCount: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { playCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Method to mark activity as incomplete (for ongoing actions)
userActivitySchema.methods.markIncomplete = function() {
  this.isCompleted = false;
  return this.save();
};

// Method to complete an activity
userActivitySchema.methods.complete = function() {
  this.isCompleted = true;
  return this.save();
};

module.exports = mongoose.model('UserActivity', userActivitySchema);
