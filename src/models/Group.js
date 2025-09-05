const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Tên phòng không được quá 100 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được quá 500 ký tự']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  currentSong: {
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    startedAt: Date,
    position: {
      type: Number, // Current position in seconds
      default: 0
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    playedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  queue: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    position: Number
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: 2,
      max: 100
    },
    allowMemberAddSongs: {
      type: Boolean,
      default: true
    },
    allowMemberSkip: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  },
  chat: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Tin nhắn không được quá 500 ký tự']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  }],
  stats: {
    totalSongsPlayed: {
      type: Number,
      default: 0
    },
    totalPlayTime: {
      type: Number, // in seconds
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ owner: 1, createdAt: -1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ isActive: 1, 'settings.isPublic': 1 });
groupSchema.index({ name: 'text', description: 'text' });

// Method to add member
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
      existingMember.role = role;
    }
  } else {
    if (this.members.length >= this.settings.maxMembers) {
      throw new Error('Group is full');
    }
    
    this.members.push({
      user: userId,
      role: role
    });
  }
  
  this.stats.totalMembers = this.members.filter(m => m.isActive).length;
  return this.save();
};

// Method to remove member
groupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
    this.stats.totalMembers = this.members.filter(m => m.isActive).length;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add song to queue
groupSchema.methods.addToQueue = function(songId, userId) {
  const position = this.queue.length;
  this.queue.push({
    song: songId,
    addedBy: userId,
    position: position
  });
  return this.save();
};

// Method to remove song from queue
groupSchema.methods.removeFromQueue = function(songId) {
  this.queue = this.queue.filter(item => item.song.toString() !== songId.toString());
  // Reorder positions
  this.queue.forEach((item, index) => {
    item.position = index;
  });
  return this.save();
};

// Method to skip current song
groupSchema.methods.skipSong = function() {
  if (this.queue.length > 0) {
    const nextSong = this.queue.shift();
    this.currentSong = {
      song: nextSong.song,
      startedAt: new Date(),
      position: 0,
      isPlaying: true,
      playedBy: nextSong.addedBy
    };
    this.stats.totalSongsPlayed += 1;
  } else {
    this.currentSong = {
      song: null,
      startedAt: null,
      position: 0,
      isPlaying: false,
      playedBy: null
    };
  }
  return this.save();
};

// Method to send chat message
groupSchema.methods.sendMessage = function(userId, message) {
  this.chat.push({
    user: userId,
    message: message
  });
  
  // Keep only last 100 messages
  if (this.chat.length > 100) {
    this.chat = this.chat.slice(-100);
  }
  
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema);
