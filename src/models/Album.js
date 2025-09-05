const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tên album là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên album không được quá 100 ký tự']
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: [true, 'Nghệ sĩ là bắt buộc']
  },
  description: {
    type: String,
    maxlength: [500, 'Mô tả không được quá 500 ký tự']
  },
  coverImage: {
    type: String,
    default: null
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  genre: {
    type: String,
    maxlength: [30, 'Thể loại không được quá 30 ký tự']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalTracks: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // Tổng thời lượng album (giây)
    default: 0
  }
}, {
  timestamps: true
});

// Index để tìm kiếm
albumSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Album', albumSchema); 