const mongoose = require('mongoose');

const playHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User là bắt buộc']
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: [true, 'Bài hát là bắt buộc']
  },
  playedAt: {
    type: Date,
    default: Date.now
  },
  playDuration: {
    type: Number, // Thời gian nghe (giây)
    default: 0
  },
  completed: {
    type: Boolean,
    default: false // Nghe hết bài hay chưa
  },
  source: {
    type: String,
    enum: ['playlist', 'album', 'search', 'recommendation', 'radio'],
    default: 'search'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId, // ID của playlist/album nếu có
    default: null
  },
  device: {
    type: String,
    maxlength: [50, 'Tên thiết bị không được quá 50 ký tự']
  },
  ipAddress: {
    type: String,
    maxlength: [45, 'IP address không hợp lệ']
  }
}, {
  timestamps: true
});

// Index để tối ưu query
playHistorySchema.index({ user: 1, playedAt: -1 });
playHistorySchema.index({ song: 1, playedAt: -1 });

module.exports = mongoose.model('PlayHistory', playHistorySchema); 