const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nghệ sĩ là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên nghệ sĩ không được quá 100 ký tự']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Tiểu sử không được quá 1000 ký tự']
  },
  avatar: {
    type: String,
    default: null
  },
  country: {
    type: String,
    maxlength: [50, 'Tên quốc gia không được quá 50 ký tự']
  },
  genres: [{
    type: String,
    maxlength: [30, 'Tên thể loại không được quá 30 ký tự']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalFollowers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index để tìm kiếm
artistSchema.index({ name: 'text', bio: 'text' });

module.exports = mongoose.model('Artist', artistSchema); 