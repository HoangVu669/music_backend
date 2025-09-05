const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  album: {
    type: String,
    trim: true
  },
  genre: {
    type: String,
    required: true,
    enum: ['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'other']
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: null
  },
  lyrics: {
    type: String,
    default: null
  },
  language: {
    type: String,
    default: 'vi'
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  isExplicit: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  stats: {
    playCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  mood: {
    type: String,
    enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill']
  },
  bpm: {
    type: Number, // beats per minute
    min: 60,
    max: 200
  },
  key: {
    type: String,
    enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  },
  audioQuality: {
    type: String,
    enum: ['standard', 'high', 'lossless', 'hi-res'],
    default: 'standard'
  },
  fileSize: {
    type: Number, // in bytes
    required: true
  },
  format: {
    type: String,
    enum: ['mp3', 'wav', 'flac', 'aac'],
    default: 'mp3'
  },
  bitrate: {
    type: Number, // in kbps
    required: true
  },
  sampleRate: {
    type: Number, // in Hz
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
songSchema.index({ title: 'text', artist: 'text', genre: 'text' });
songSchema.index({ artist: 1, createdAt: -1 });
songSchema.index({ genre: 1, playCount: -1 });
songSchema.index({ isApproved: 1, isPublic: 1 });

// Virtual for formatted duration
songSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to increment play count
songSchema.methods.incrementPlayCount = function() {
  this.stats.playCount += 1;
  return this.save();
};

// Method to increment like count
songSchema.methods.incrementLikeCount = function() {
  this.stats.likeCount += 1;
  return this.save();
};

// Method to increment download count
songSchema.methods.incrementDownloadCount = function() {
  this.stats.downloadCount += 1;
  return this.save();
};

module.exports = mongoose.model('Song', songSchema); 