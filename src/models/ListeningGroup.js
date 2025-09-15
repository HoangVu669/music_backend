const mongoose = require('mongoose');

const listeningGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['host', 'moderator', 'member'],
      default: 'member'
    }
  }],
  currentSong: {
    songId: String,
    title: String,
    artist: String,
    thumbnail: String,
    duration: Number,
    startTime: Date,
    position: {
      type: Number,
      default: 0
    },
    isPlaying: {
      type: Boolean,
      default: false
    }
  },
  queue: [{
    songId: String,
    title: String,
    artist: String,
    thumbnail: String,
    duration: Number,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    order: Number
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 50
    },
    allowMembersAddSongs: {
      type: Boolean,
      default: true
    },
    allowMembersSkip: {
      type: Boolean,
      default: true
    },
    autoPlay: {
      type: Boolean,
      default: true
    }
  },
  chat: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'system', 'song_added', 'song_skipped'],
      default: 'message'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  endedAt: Date
}, {
  timestamps: true
});

// Indexes
listeningGroupSchema.index({ hostId: 1 });
listeningGroupSchema.index({ 'members.userId': 1 });
listeningGroupSchema.index({ isActive: 1 });
listeningGroupSchema.index({ 'settings.isPublic': 1 });

// Methods
listeningGroupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (existingMember) {
    existingMember.isActive = true;
    existingMember.joinedAt = new Date();
  } else {
    this.members.push({
      userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

listeningGroupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
  
  return this.save();
};

listeningGroupSchema.methods.addSongToQueue = function(songData, addedBy) {
  const order = this.queue.length;
  this.queue.push({
    ...songData,
    addedBy,
    addedAt: new Date(),
    order
  });
  
  return this.save();
};

listeningGroupSchema.methods.removeSongFromQueue = function(songIndex) {
  if (songIndex >= 0 && songIndex < this.queue.length) {
    this.queue.splice(songIndex, 1);
    // Reorder remaining songs
    this.queue.forEach((song, index) => {
      song.order = index;
    });
  }
  
  return this.save();
};

listeningGroupSchema.methods.nextSong = function() {
  if (this.queue.length > 0) {
    const nextSong = this.queue.shift();
    this.currentSong = {
      ...nextSong,
      startTime: new Date(),
      position: 0,
      isPlaying: true
    };
    
    // Reorder remaining songs
    this.queue.forEach((song, index) => {
      song.order = index;
    });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

listeningGroupSchema.methods.addChatMessage = function(userId, username, message, type = 'message') {
  this.chat.push({
    userId,
    username,
    message,
    type,
    timestamp: new Date()
  });
  
  // Keep only last 100 messages
  if (this.chat.length > 100) {
    this.chat = this.chat.slice(-100);
  }
  
  return this.save();
};

listeningGroupSchema.methods.updatePlaybackState = function(isPlaying, position = 0) {
  this.currentSong.isPlaying = isPlaying;
  this.currentSong.position = position;
  
  return this.save();
};

listeningGroupSchema.methods.getActiveMembers = function() {
  return this.members.filter(member => member.isActive);
};

listeningGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
};

listeningGroupSchema.methods.canModifyQueue = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
  
  if (!member) return false;
  
  return member.role === 'host' || 
         member.role === 'moderator' || 
         this.settings.allowMembersAddSongs;
};

listeningGroupSchema.methods.canSkip = function(userId) {
  const member = this.members.find(member => 
    member.userId.toString() === userId.toString() && member.isActive
  );
  
  if (!member) return false;
  
  return member.role === 'host' || 
         member.role === 'moderator' || 
         this.settings.allowMembersSkip;
};

module.exports = mongoose.model('ListeningGroup', listeningGroupSchema);
