/**
 * Socket Service - Real-time communication for rooms
 * Clean Code: Tách biệt WebSocket logic, hỗ trợ đầy đủ real-time events
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

    // Tracking: roomId -> Set of socketIds
    this.roomSockets = new Map();
    // Tracking: socketId -> roomId
    this.socketRooms = new Map();

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Socket authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

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
   * Setup event handlers - Real-time events cho room
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId}, ${socket.userName})`);

      // ===== ROOM EVENTS =====

      /**
       * Join room
       * Event: 'room:join'
       * Data: { roomId }
       */
      socket.on('room:join', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          // Join room in service
          try {
            await roomService.joinRoom(roomId, socket.userId, socket.userName);
          } catch (error) {
            // Nếu là pending approval, vẫn join socket room để nhận updates
            if (error.responseCode === 'PENDING_APPROVAL') {
              socket.emit('room:join-pending', { roomId, message: error.message });
            } else {
              throw error;
            }
          }

          // Join socket room
          socket.join(`room:${roomId}`);

          // Track socket in room
          if (!this.roomSockets.has(roomId)) {
            this.roomSockets.set(roomId, new Set());
          }
          this.roomSockets.get(roomId).add(socket.id);
          this.socketRooms.set(socket.id, roomId);

          // Get room data
          const room = await roomService.getRoomWithSongs(roomId, socket.userId);

          // Notify user
          socket.emit('room:joined', { room });

          // Notify others in room
          socket.to(`room:${roomId}`).emit('room:member-joined', {
            userId: socket.userId,
            userName: socket.userName,
            memberCount: room.memberCount,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to join room' });
        }
      });

      /**
       * Leave room
       * Event: 'room:leave'
       * Data: { roomId }
       */
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
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to leave room' });
        }
      });

      // ===== PLAYBACK EVENTS =====

      /**
       * Update playback state
       * Event: 'room:playback-update'
       * Data: { roomId, currentSongId, currentPosition, isPlaying }
       */
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
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to update playback' });
        }
      });

      // ===== QUEUE EVENTS =====

      /**
       * Add song to queue
       * Event: 'room:queue-add'
       * Data: { roomId, songId }
       */
      socket.on('room:queue-add', async (data) => {
        try {
          const { roomId, songId } = data;
          if (!roomId || !songId) {
            socket.emit('error', { message: 'Room ID and Song ID are required' });
            return;
          }

          const room = await roomService.addSongToQueue(roomId, songId, socket.userId);

          // Broadcast to all in room (including sender)
          this.io.to(`room:${roomId}`).emit('room:queue-updated', {
            queue: room.queue,
            addedBy: socket.userId,
            addedByUserName: socket.userName,
            songId,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to add song to queue' });
        }
      });

      /**
       * Remove song from queue
       * Event: 'room:queue-remove'
       * Data: { roomId, songId }
       */
      socket.on('room:queue-remove', async (data) => {
        try {
          const { roomId, songId } = data;
          if (!roomId || !songId) {
            socket.emit('error', { message: 'Room ID and Song ID are required' });
            return;
          }

          const room = await roomService.removeSongFromQueue(roomId, songId, socket.userId);

          // Broadcast to all in room (including sender)
          this.io.to(`room:${roomId}`).emit('room:queue-updated', {
            queue: room.queue,
            removedBy: socket.userId,
            removedByUserName: socket.userName,
            songId,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to remove song from queue' });
        }
      });

      // ===== INVITATION EVENTS =====

      /**
       * Send invitation (chủ phòng gửi lời mời)
       * Event: 'room:invite'
       * Data: { roomId, inviteeId, message }
       */
      socket.on('room:invite', async (data) => {
        try {
          const { roomId, inviteeId, message } = data;
          if (!roomId || !inviteeId) {
            socket.emit('error', { message: 'Room ID and Invitee ID are required' });
            return;
          }

          const invitation = await roomService.inviteUser(roomId, socket.userId, inviteeId, message);

          // Emit to invitee if online
          this.io.emit('room:invitation-received', {
            invitation,
            timestamp: new Date(),
          });

          // Notify sender
          socket.emit('room:invitation-sent', {
            invitation,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to send invitation' });
        }
      });

      /**
       * Accept join request (chủ phòng chấp nhận yêu cầu)
       * Event: 'room:request-accept'
       * Data: { roomId, requestUserId }
       */
      socket.on('room:request-accept', async (data) => {
        try {
          const { roomId, requestUserId } = data;
          if (!roomId || !requestUserId) {
            socket.emit('error', { message: 'Room ID and Request User ID are required' });
            return;
          }

          const room = await roomService.acceptJoinRequest(roomId, socket.userId, requestUserId);

          // Notify requester
          this.io.emit('room:request-accepted', {
            roomId,
            room,
            timestamp: new Date(),
          });

          // Notify all in room
          this.io.to(`room:${roomId}`).emit('room:member-joined', {
            userId: requestUserId,
            memberCount: room.memberCount,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to accept request' });
        }
      });

      /**
       * Reject join request (chủ phòng từ chối yêu cầu)
       * Event: 'room:request-reject'
       * Data: { roomId, requestUserId }
       */
      socket.on('room:request-reject', async (data) => {
        try {
          const { roomId, requestUserId } = data;
          if (!roomId || !requestUserId) {
            socket.emit('error', { message: 'Room ID and Request User ID are required' });
            return;
          }

          await roomService.rejectJoinRequest(roomId, socket.userId, requestUserId);

          // Notify requester
          this.io.emit('room:request-rejected', {
            roomId,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to reject request' });
        }
      });

      // ===== CHAT EVENTS =====

      /**
       * Chat in room
       * Event: 'room:chat'
       * Data: { roomId, message }
       */
      socket.on('room:chat', async (data) => {
        try {
          const { roomId, message } = data;
          if (!roomId || !message || message.trim().length === 0) {
            return;
          }

          // Broadcast to all in room (including sender)
          this.io.to(`room:${roomId}`).emit('room:chat-message', {
            userId: socket.userId,
            userName: socket.userName,
            message: message.trim(),
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to send message' });
        }
      });

      // ===== DISCONNECT =====

      /**
       * Disconnect handler
       */
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
              timestamp: new Date(),
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

  /**
   * Broadcast to room (helper method)
   * @param {string} roomId - Room ID
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcastToRoom(roomId, event, data) {
    this.io.to(`room:${roomId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }
}

module.exports = SocketService;
