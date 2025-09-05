const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  songs: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  coverImage: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  genre: {
    type: String,
    enum: ['pop', 'rock', 'jazz', 'classical', 'hip-hop', 'country', 'electronic', 'folk', 'blues', 'r&b', 'mixed', 'other']
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'upbeat', 'chill', 'mixed']
  },
  stats: {
    totalSongs: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number, // in seconds
      default: 0
    },
    playCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    followerCount: {
      type: Number,
      default: 0
    }
  },
  settings: {
    allowDuplicates: {
      type: Boolean,
      default: false
    },
    autoShuffle: {
      type: Boolean,
      default: false
    },
    crossfade: {
      type: Boolean,
      default: false
    }
  },
  featured: {
    isFeatured: {
      type: Boolean,
      default: false
    },
    featuredAt: Date,
    featuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
playlistSchema.index({ owner: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1, stats: { playCount: -1 } });
playlistSchema.index({ tags: 1 });
playlistSchema.index({ genre: 1, mood: 1 });

// Virtual for formatted total duration
playlistSchema.virtual('formattedTotalDuration').get(function() {
  const hours = Math.floor(this.stats.totalDuration / 3600);
  const minutes = Math.floor((this.stats.totalDuration % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Method to add song to playlist
playlistSchema.methods.addSong = function(songId, userId) {
  // Check if song already exists (if duplicates not allowed)
  if (!this.settings.allowDuplicates) {
    const exists = this.songs.some(item => item.song.toString() === songId.toString());
    if (exists) {
      throw new Error('Song already exists in playlist');
    }
  }
  
  this.songs.push({
    song: songId,
    addedBy: userId
  });
  
  this.stats.totalSongs = this.songs.length;
  return this.save();
};

// Method to remove song from playlist
playlistSchema.methods.removeSong = function(songId) {
  this.songs = this.songs.filter(item => item.song.toString() !== songId.toString());
  this.stats.totalSongs = this.songs.length;
  return this.save();
};

// Method to reorder songs
playlistSchema.methods.reorderSongs = function(songIds) {
  const reorderedSongs = [];
  
  songIds.forEach(songId => {
    const songItem = this.songs.find(item => item.song.toString() === songId.toString());
    if (songItem) {
      reorderedSongs.push(songItem);
    }
  });
  
  this.songs = reorderedSongs;
  return this.save();
};

// Pre-save middleware to update total duration
playlistSchema.pre('save', async function(next) {
  if (this.isModified('songs')) {
    try {
      const Song = mongoose.model('Song');
      let totalDuration = 0;
      
      for (const songItem of this.songs) {
        const song = await Song.findById(songItem.song);
        if (song) {
          totalDuration += song.duration;
        }
      }
      
      this.stats.totalDuration = totalDuration;
      this.stats.totalSongs = this.songs.length;
    } catch (error) {
      next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Playlist', playlistSchema); 