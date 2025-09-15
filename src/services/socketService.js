const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ListeningGroup = require('../models/ListeningGroup');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.userSockets = new Map(); // userId -> socketId
    this.groupSockets = new Map(); // groupId -> Set of socketIds
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.username = user.username;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.username} connected with socket ${socket.id}`);
      
      // Store user socket mapping
      this.userSockets.set(socket.userId, socket.id);
      
      // Handle joining listening group
      socket.on('join_group', async (data) => {
        await this.handleJoinGroup(socket, data);
      });
      
      // Handle leaving listening group
      socket.on('leave_group', async (data) => {
        await this.handleLeaveGroup(socket, data);
      });
      
      // Handle chat messages
      socket.on('send_message', async (data) => {
        await this.handleChatMessage(socket, data);
      });
      
      // Handle playback control
      socket.on('playback_control', async (data) => {
        await this.handlePlaybackControl(socket, data);
      });
      
      // Handle adding song to queue
      socket.on('add_song_to_queue', async (data) => {
        await this.handleAddSongToQueue(socket, data);
      });
      
      // Handle removing song from queue
      socket.on('remove_song_from_queue', async (data) => {
        await this.handleRemoveSongFromQueue(socket, data);
      });
      
      // Handle skipping song
      socket.on('skip_song', async (data) => {
        await this.handleSkipSong(socket, data);
      });
      
      // Handle user activity (typing, etc.)
      socket.on('user_activity', async (data) => {
        await this.handleUserActivity(socket, data);
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinGroup(socket, data) {
    try {
      const { groupId } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }
      
      if (!group.isActive) {
        socket.emit('error', { message: 'Group is not active' });
        return;
      }
      
      // Check if group is full
      const activeMembers = group.getActiveMembers();
      if (activeMembers.length >= group.settings.maxMembers) {
        socket.emit('error', { message: 'Group is full' });
        return;
      }
      
      // Add user to group
      await group.addMember(socket.userId);
      
      // Join socket room
      socket.join(`group_${groupId}`);
      
      // Add to group sockets mapping
      if (!this.groupSockets.has(groupId)) {
        this.groupSockets.set(groupId, new Set());
      }
      this.groupSockets.get(groupId).add(socket.id);
      
      // Emit to group that user joined
      socket.to(`group_${groupId}`).emit('user_joined', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });
      
      // Send current group state to user
      socket.emit('group_state', {
        group: group,
        currentSong: group.currentSong,
        queue: group.queue,
        members: group.getActiveMembers(),
        chat: group.chat.slice(-20) // Last 20 messages
      });
      
      console.log(`User ${socket.username} joined group ${groupId}`);
      
    } catch (error) {
      console.error('Error handling join group:', error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  }

  async handleLeaveGroup(socket, data) {
    try {
      const { groupId } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (group) {
        await group.removeMember(socket.userId);
        
        // Leave socket room
        socket.leave(`group_${groupId}`);
        
        // Remove from group sockets mapping
        if (this.groupSockets.has(groupId)) {
          this.groupSockets.get(groupId).delete(socket.id);
          if (this.groupSockets.get(groupId).size === 0) {
            this.groupSockets.delete(groupId);
          }
        }
        
        // Emit to group that user left
        socket.to(`group_${groupId}`).emit('user_left', {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date()
        });
        
        console.log(`User ${socket.username} left group ${groupId}`);
      }
      
    } catch (error) {
      console.error('Error handling leave group:', error);
    }
  }

  async handleChatMessage(socket, data) {
    try {
      const { groupId, message } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group || !group.isMember(socket.userId)) {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }
      
      // Add message to group chat
      await group.addChatMessage(socket.userId, socket.username, message);
      
      // Broadcast message to all group members
      this.io.to(`group_${groupId}`).emit('new_message', {
        userId: socket.userId,
        username: socket.username,
        message: message,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handlePlaybackControl(socket, data) {
    try {
      const { groupId, action, position } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group || !group.isMember(socket.userId)) {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }
      
      // Only host can control playback
      const member = group.members.find(m => 
        m.userId.toString() === socket.userId && m.isActive
      );
      
      if (member.role !== 'host') {
        socket.emit('error', { message: 'Only host can control playback' });
        return;
      }
      
      let updated = false;
      
      switch (action) {
        case 'play':
          await group.updatePlaybackState(true, position || 0);
          updated = true;
          break;
        case 'pause':
          await group.updatePlaybackState(false, position || 0);
          updated = true;
          break;
        case 'seek':
          await group.updatePlaybackState(group.currentSong.isPlaying, position);
          updated = true;
          break;
      }
      
      if (updated) {
        // Broadcast playback state to all group members
        this.io.to(`group_${groupId}`).emit('playback_state_changed', {
          action: action,
          isPlaying: group.currentSong.isPlaying,
          position: group.currentSong.position,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Error handling playback control:', error);
      socket.emit('error', { message: 'Failed to control playback' });
    }
  }

  async handleAddSongToQueue(socket, data) {
    try {
      const { groupId, songData } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group || !group.isMember(socket.userId)) {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }
      
      if (!group.canModifyQueue(socket.userId)) {
        socket.emit('error', { message: 'Not allowed to add songs to queue' });
        return;
      }
      
      // Add song to queue
      await group.addSongToQueue(songData, socket.userId);
      
      // Broadcast updated queue to all group members
      this.io.to(`group_${groupId}`).emit('queue_updated', {
        queue: group.queue,
        addedBy: socket.username,
        songTitle: songData.title
      });
      
      // Add system message to chat
      await group.addChatMessage(
        socket.userId, 
        socket.username, 
        `đã thêm "${songData.title}" vào hàng đợi`, 
        'song_added'
      );
      
      this.io.to(`group_${groupId}`).emit('new_message', {
        userId: socket.userId,
        username: socket.username,
        message: `đã thêm "${songData.title}" vào hàng đợi`,
        type: 'song_added',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error handling add song to queue:', error);
      socket.emit('error', { message: 'Failed to add song to queue' });
    }
  }

  async handleRemoveSongFromQueue(socket, data) {
    try {
      const { groupId, songIndex } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group || !group.isMember(socket.userId)) {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }
      
      if (!group.canModifyQueue(socket.userId)) {
        socket.emit('error', { message: 'Not allowed to remove songs from queue' });
        return;
      }
      
      const removedSong = group.queue[songIndex];
      if (!removedSong) {
        socket.emit('error', { message: 'Song not found in queue' });
        return;
      }
      
      // Remove song from queue
      await group.removeSongFromQueue(songIndex);
      
      // Broadcast updated queue to all group members
      this.io.to(`group_${groupId}`).emit('queue_updated', {
        queue: group.queue,
        removedBy: socket.username,
        songTitle: removedSong.title
      });
      
    } catch (error) {
      console.error('Error handling remove song from queue:', error);
      socket.emit('error', { message: 'Failed to remove song from queue' });
    }
  }

  async handleSkipSong(socket, data) {
    try {
      const { groupId } = data;
      
      const group = await ListeningGroup.findById(groupId);
      if (!group || !group.isMember(socket.userId)) {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }
      
      if (!group.canSkip(socket.userId)) {
        socket.emit('error', { message: 'Not allowed to skip songs' });
        return;
      }
      
      // Move to next song
      await group.nextSong();
      
      // Broadcast new song to all group members
      this.io.to(`group_${groupId}`).emit('song_changed', {
        currentSong: group.currentSong,
        queue: group.queue,
        skippedBy: socket.username,
        timestamp: new Date()
      });
      
      // Add system message to chat
      await group.addChatMessage(
        socket.userId, 
        socket.username, 
        `đã bỏ qua bài hát`, 
        'song_skipped'
      );
      
      this.io.to(`group_${groupId}`).emit('new_message', {
        userId: socket.userId,
        username: socket.username,
        message: `đã bỏ qua bài hát`,
        type: 'song_skipped',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error handling skip song:', error);
      socket.emit('error', { message: 'Failed to skip song' });
    }
  }

  async handleUserActivity(socket, data) {
    try {
      const { groupId, activity } = data;
      
      // Broadcast user activity to group members
      socket.to(`group_${groupId}`).emit('user_activity', {
        userId: socket.userId,
        username: socket.username,
        activity: activity,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error handling user activity:', error);
    }
  }

  async handleDisconnect(socket) {
    try {
      console.log(`User ${socket.username} disconnected`);
      
      // Remove from user sockets mapping
      this.userSockets.delete(socket.userId);
      
      // Handle leaving all groups
      for (const [groupId, socketIds] of this.groupSockets.entries()) {
        if (socketIds.has(socket.id)) {
          socketIds.delete(socket.id);
          
          if (socketIds.size === 0) {
            this.groupSockets.delete(groupId);
          } else {
            // Notify group that user left
            socket.to(`group_${groupId}`).emit('user_left', {
              userId: socket.userId,
              username: socket.username,
              timestamp: new Date()
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  // Utility methods
  getIO() {
    return this.io;
  }

  getUserSocket(userId) {
    const socketId = this.userSockets.get(userId);
    return socketId ? this.io.sockets.sockets.get(socketId) : null;
  }

  emitToUser(userId, event, data) {
    const socket = this.getUserSocket(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  emitToGroup(groupId, event, data) {
    this.io.to(`group_${groupId}`).emit(event, data);
  }
}

module.exports = SocketService;
