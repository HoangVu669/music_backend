/**
 * Socket Service - Real-time communication for rooms
 */
const { Server } = require('socket.io');
const { verifyJwt } = require('../utils/jwt');
const roomService = require('./user/roomService');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.roomSockets = new Map(); // roomId -> Set of socketIds
    this.socketRooms = new Map(); // socketId -> roomId

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Socket authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const payload = verifyJwt(token);
        if (!payload) {
          return next(new Error('Invalid token'));
        }
        socket.userId = payload.id;
        socket.userName = payload.username || payload.fullname || 'User';
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userName})`);

      // Join room
      socket.on('room:join', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          // Join room in service
          await roomService.joinRoom(roomId, socket.userId, socket.userName);

          // Join socket room
          socket.join(`room:${roomId}`);
          
          // Track socket in room
          if (!this.roomSockets.has(roomId)) {
            this.roomSockets.set(roomId, new Set());
          }
          this.roomSockets.get(roomId).add(socket.id);
          this.socketRooms.set(socket.id, roomId);

          // Get room data
          const room = await roomService.getRoomWithSongs(roomId);

          // Notify user
          socket.emit('room:joined', { room });

          // Notify others in room
          socket.to(`room:${roomId}`).emit('room:member-joined', {
            userId: socket.userId,
            userName: socket.userName,
            memberCount: room.memberCount,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Leave room
      socket.on('room:leave', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) return;

          await roomService.leaveRoom(roomId, socket.userId);
          socket.leave(`room:${roomId}`);

          // Remove from tracking
          if (this.roomSockets.has(roomId)) {
            this.roomSockets.get(roomId).delete(socket.id);
          }
          this.socketRooms.delete(socket.id);

          // Notify others
          socket.to(`room:${roomId}`).emit('room:member-left', {
            userId: socket.userId,
            userName: socket.userName,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Update playback state
      socket.on('room:playback-update', async (data) => {
        try {
          const { roomId, currentSongId, currentPosition, isPlaying } = data;
          if (!roomId) return;

          // Update in DB
          const room = await roomService.updatePlaybackState(roomId, {
            currentSongId,
            currentPosition,
            isPlaying,
          });

          // Broadcast to all in room (except sender)
          socket.to(`room:${roomId}`).emit('room:playback-update', {
            currentSongId,
            currentPosition,
            isPlaying,
            lastSyncAt: room.lastSyncAt,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Add song to queue
      socket.on('room:queue-add', async (data) => {
        try {
          const { roomId, songId } = data;
          if (!roomId || !songId) return;

          const room = await roomService.addSongToQueue(roomId, songId, socket.userId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('room:queue-updated', {
            queue: room.queue,
            addedBy: socket.userId,
            addedByUserName: socket.userName,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Remove song from queue
      socket.on('room:queue-remove', async (data) => {
        try {
          const { roomId, songId } = data;
          if (!roomId || !songId) return;

          const room = await roomService.removeSongFromQueue(roomId, songId, socket.userId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('room:queue-updated', {
            queue: room.queue,
            removedBy: socket.userId,
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Chat in room
      socket.on('room:chat', async (data) => {
        try {
          const { roomId, message } = data;
          if (!roomId || !message) return;

          // Save chat message (you can implement RoomChat model if needed)
          // For now, just broadcast

          // Broadcast to all in room (including sender)
          this.io.to(`room:${roomId}`).emit('room:chat-message', {
            userId: socket.userId,
            userName: socket.userName,
            message,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);

        // Leave room if in one
        const roomId = this.socketRooms.get(socket.id);
        if (roomId) {
          try {
            await roomService.leaveRoom(roomId, socket.userId);
            socket.to(`room:${roomId}`).emit('room:member-left', {
              userId: socket.userId,
              userName: socket.userName,
            });
          } catch (error) {
            console.error('Error leaving room on disconnect:', error);
          }

          // Clean up tracking
          if (this.roomSockets.has(roomId)) {
            this.roomSockets.get(roomId).delete(socket.id);
          }
          this.socketRooms.delete(socket.id);
        }
      });
    });
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = SocketService;

