const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'like', 'comment', 'follow', 'group_invite', 'group_join', 
      'group_leave', 'song_added', 'playlist_shared', 'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Tiêu đề không được quá 100 ký tự']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Nội dung không được quá 500 ký tự']
  },
  data: {
    // Flexible data object for different notification types
    songId: mongoose.Schema.Types.ObjectId,
    playlistId: mongoose.Schema.Types.ObjectId,
    groupId: mongoose.Schema.Types.ObjectId,
    commentId: mongoose.Schema.Types.ObjectId,
    fromUserId: mongoose.Schema.Types.ObjectId,
    // Add more fields as needed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = function(userId, type, title, message, data = {}) {
  return this.create({
    user: userId,
    type,
    title,
    message,
    data
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark as deleted
notificationSchema.methods.markAsDeleted = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    user: userId,
    isRead: false,
    isDeleted: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      user: userId,
      isRead: false,
      isDeleted: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
