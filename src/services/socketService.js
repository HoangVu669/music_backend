/**
 * Socket Service - Real-time communication for rooms
 * Clean Code: Tách biệt WebSocket logic, hỗ trợ đầy đủ real-time events
 */
const { Server } = require('socket.io');
const { verifyJwt } = require('../utils/jwt');
const roomService = require('./user/roomService');
const djRotationService = require('./user/djRotationService');
const voteSkipService = require('./user/voteSkipService');
const { getDjRotationEngine } = require('./djRotationEngine');
const { getPlaybackEngine } = require('./playbackEngine');
const { getRoomStateCache } = require('./roomStateCache');
const { getSyncData, detectJitter } = require('../utils/syncUtils');
const jqbxConfig = require('../config/jqbx');
const Room = require('../models/Room');

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
    // Tracking: roomId -> host socketId (for strict sync)
    this.roomHosts = new Map();
    // Tracking: roomId -> sync interval
    this.syncIntervals = new Map();
    // Tracking: socketId -> last activity time (for idle detection)
    this.socketActivity = new Map();
    // Tracking: roomId -> previous sync position (for jitter detection)
    this.previousSyncPositions = new Map();

    this.setupMiddleware();
    this.setupEventHandlers();

    // Initialize DJ Rotation Engine
    const { getDjRotationEngine } = require('./djRotationEngine');
    this.djRotationEngine = getDjRotationEngine(this);

    // Initialize Playback Engine
    const { getPlaybackEngine } = require('./playbackEngine');
    this.playbackEngine = getPlaybackEngine(this);

    // Initialize Room State Cache
    const { getRoomStateCache } = require('./roomStateCache');
    this.roomStateCache = getRoomStateCache();
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
          // Track socket activity
          this.socketActivity.set(socket.id, Date.now());

          // Get room data
          const room = await roomService.getRoomWithSongs(roomId, socket.userId);

          // Check if user is host
          const isHost = String(room.hostId || room.ownerId) === String(socket.userId);
          if (isHost) {
            this.roomHosts.set(roomId, socket.id);
            this.startSyncInterval(roomId, socket.id);
          }

          // Notify user
          socket.emit('room:joined', { room });

          // JQBX: Send sync:full event when joining/reconnecting (complete sync state)
          const syncData = getSyncData(room);
          socket.emit('sync:full', {
            roomId,
            currentTrack: room.currentTrack || null,
            syncData,
            queue: room.queue || [],
            mode: room.mode || 'normal',
            timestamp: Date.now(),
          });

          // Send current sync data to new member (JQBX-style: member join phải sync ngay)
          if (room.currentTrack?.zingId) {
            socket.emit('player:sync', {
              roomId,
              ...syncData,
              latencyProbe: Date.now(), // For RTT calculation
            });
          }

          // Nếu là DJ rotation mode, gửi thêm rotation state
          if (room.mode === 'dj_rotation') {
            const rotationState = await djRotationService.getRoomState(roomId, socket.userId);
            socket.emit('rotation:state_update', {
              roomId,
              ...rotationState,
              timestamp: Date.now(),
            });
          }

          // Notify others in room
          socket.to(`room:${roomId}`).emit('room:member-joined', {
            userId: socket.userId,
            userName: socket.userName,
            memberCount: room.memberCount,
            timestamp: new Date(),
          });

          // Emit update_members event
          this.io.to(`room:${roomId}`).emit('room:update_members', {
            roomId,
            members: room.members || [],
            memberCount: room.memberCount,
            timestamp: Date.now(),
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

          // Stop sync interval if host left
          if (this.roomHosts.get(roomId) === socket.id) {
            this.stopSyncInterval(roomId);
            this.roomHosts.delete(roomId);
          }

          // Notify others
          socket.to(`room:${roomId}`).emit('room:member-left', {
            userId: socket.userId,
            userName: socket.userName,
            timestamp: new Date(),
          });

          // Emit update_members event
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (room) {
            this.io.to(`room:${roomId}`).emit('room:update_members', {
              roomId,
              members: room.members || [],
              memberCount: room.memberCount,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to leave room' });
        }
      });

      // ===== PLAYBACK EVENTS =====

      /**
       * Update playback state (CHỈ CHỦ PHÒNG)
       * Event: 'room:playback-update'
       * Data: { roomId, currentSongId, currentPosition, isPlaying }
       */
      socket.on('room:playback-update', async (data) => {
        try {
          const { roomId, currentSongId, currentPosition, isPlaying } = data;
          if (!roomId) return;

          // Update in DB (với permission check - chỉ owner)
          const room = await roomService.updatePlaybackState(roomId, {
            currentSongId,
            currentPosition,
            isPlaying,
          }, socket.userId);

          // Broadcast to all in room (including sender để sync)
          this.io.to(`room:${roomId}`).emit('room:playback-update', {
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

      /**
       * Chủ phòng chọn bài hát từ queue để phát
       * Event: 'room:play-song'
       * Data: { roomId, songId }
       */
      socket.on('room:play-song', async (data) => {
        try {
          const { roomId, songId } = data;
          if (!roomId || !songId) {
            socket.emit('error', { message: 'Room ID and Song ID are required' });
            return;
          }

          const room = await roomService.playSongFromQueue(roomId, songId, socket.userId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('room:song-changed', {
            currentSongId: room.currentSongId,
            currentSongStreamingUrl: room.currentSongStreamingUrl,
            isPlaying: true,
            timestamp: new Date(),
          });

          // Also emit playback update
          this.io.to(`room:${roomId}`).emit('room:playback-update', {
            currentSongId: room.currentSongId,
            currentPosition: 0,
            isPlaying: true,
            lastSyncAt: room.lastSyncAt,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to play song' });
        }
      });

      /**
       * Chủ phòng next bài hát (chỉ owner)
       * Event: 'room:next-song'
       * Data: { roomId }
       */
      socket.on('room:next-song', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const room = await roomService.playNextSong(roomId, socket.userId);

          if (room) {
            // Broadcast to all in room
            this.io.to(`room:${roomId}`).emit('room:song-changed', {
              currentSongId: room.currentSongId,
              currentSongStreamingUrl: room.currentSongStreamingUrl,
              isPlaying: true,
              timestamp: new Date(),
            });

            // Also emit playback update
            this.io.to(`room:${roomId}`).emit('room:playback-update', {
              currentSongId: room.currentSongId,
              currentPosition: 0,
              isPlaying: true,
              lastSyncAt: room.lastSyncAt,
              timestamp: new Date(),
            });
          } else {
            // Không còn bài hát nào
            this.io.to(`room:${roomId}`).emit('room:playback-update', {
              currentSongId: null,
              currentPosition: 0,
              isPlaying: false,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to play next song' });
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

      // ===== SYNC & DRIFT CORRECTION EVENTS =====

      /**
       * Sync ping - for RTT calculation
       * Event: 'sync:ping'
       * Data: { clientTimestamp }
       */
      socket.on('sync:ping', (data) => {
        const { clientTimestamp } = data || {};
        socket.emit('sync:pong', {
          clientTimestamp: clientTimestamp || Date.now(),
          serverTimestamp: Date.now(),
        });
        // Update socket activity
        this.socketActivity.set(socket.id, Date.now());
      });

      // ===== JQBX-STYLE EVENTS =====

      /**
       * JQBX: Host play
       * Event: 'player:host_play'
       * Data: { roomId }
       */
      socket.on('player:host_play', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          // Check room mode and route to appropriate service
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          let updatedRoom;
          if (room.mode === 'coop') {
            const coopService = require('./user/coopService');
            updatedRoom = await coopService.play(roomId, socket.userId);
          } else {
            updatedRoom = await roomService.hostPlay(roomId, socket.userId);
          }

          // Use centralized sync data utility
          const syncData = getSyncData(updatedRoom);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('player:host_play', {
            roomId,
            currentTrack: updatedRoom.currentTrack,
            syncData,
            timestamp: Date.now(),
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to play' });
        }
      });

      /**
       * JQBX: Host pause
       * Event: 'player:host_pause'
       * Data: { roomId }
       */
      socket.on('player:host_pause', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          // Check room mode and route to appropriate service
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          let updatedRoom;
          if (room.mode === 'coop') {
            const coopService = require('./user/coopService');
            updatedRoom = await coopService.pause(roomId, socket.userId);
          } else {
            updatedRoom = await roomService.hostPause(roomId, socket.userId);
          }

          // Use centralized sync data utility
          const syncData = getSyncData(updatedRoom);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('player:host_pause', {
            roomId,
            currentTrack: updatedRoom.currentTrack,
            syncData,
            timestamp: Date.now(),
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to pause' });
        }
      });

      /**
       * JQBX: Host seek
       * Event: 'player:host_seek'
       * Data: { roomId, position }
       */
      socket.on('player:host_seek', async (data) => {
        try {
          const { roomId, position } = data;
          if (!roomId || position === undefined) {
            socket.emit('error', { message: 'Room ID and position are required' });
            return;
          }

          // Check room mode and route to appropriate service
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          let updatedRoom;
          if (room.mode === 'coop') {
            const coopService = require('./user/coopService');
            updatedRoom = await coopService.seek(roomId, socket.userId, position);
          } else {
            updatedRoom = await roomService.hostSeek(roomId, socket.userId, position);
          }

          // Use centralized sync data utility
          const syncData = getSyncData(updatedRoom);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('player:host_seek', {
            roomId,
            position,
            currentTrack: updatedRoom.currentTrack,
            syncData,
            timestamp: Date.now(),
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to seek' });
        }
      });

      /**
       * JQBX: Host skip
       * Event: 'player:host_skip'
       * Data: { roomId }
       */
      socket.on('player:host_skip', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const room = await roomService.hostSkip(roomId, socket.userId);
          // Use centralized sync data utility
          const syncData = getSyncData(room);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('player:host_skip', {
            roomId,
            currentTrack: room.currentTrack,
            syncData,
            timestamp: Date.now(),
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to skip' });
        }
      });

      /**
       * JQBX: Host change track
       * Event: 'player:host_change_track'
       * Data: { roomId, zingId }
       */
      socket.on('player:host_change_track', async (data) => {
        try {
          const { roomId, zingId } = data;
          if (!roomId || !zingId) {
            socket.emit('error', { message: 'Room ID and zingId are required' });
            return;
          }

          const room = await roomService.hostChangeTrack(roomId, socket.userId, zingId);
          // Use centralized sync data utility
          const syncData = getSyncData(room);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('player:host_change_track', {
            roomId,
            currentTrack: room.currentTrack,
            syncData,
            timestamp: Date.now(),
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to change track' });
        }
      });

      /**
       * JQBX: Player sync (gửi từ host mỗi 3 giây)
       * Event: 'player:sync'
       * Data: { roomId }
       * Note: Host sẽ tự động gửi event này mỗi 5 giây, members nhận và tự hiệu chỉnh
       */
      socket.on('player:sync', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            return;
          }

          // Chỉ host mới được gửi sync
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room || String(room.hostId || room.ownerId) !== String(socket.userId)) {
            return; // Không phải host, bỏ qua
          }

          // Use centralized sync data utility
          const syncData = getSyncData(room);

          // Broadcast to all members (không gửi lại cho host)
          socket.to(`room:${roomId}`).emit('player:sync', {
            roomId,
            ...syncData,
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          // Silent fail cho sync
          console.error('Sync error:', error.message);
        }
      });

      /**
       * JQBX: Add track to queue
       * Event: 'queue:add_track'
       * Data: { roomId, zingId }
       */
      socket.on('queue:add_track', async (data) => {
        try {
          const { roomId, zingId } = data;
          if (!roomId || !zingId) {
            socket.emit('error', { message: 'Room ID and zingId are required' });
            return;
          }

          const room = await roomService.addTrackToQueue(roomId, zingId, socket.userId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('queue:add_track', {
            roomId,
            queue: room.queue,
            addedBy: socket.userId,
            addedByUserName: socket.userName,
            zingId,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to add track to queue' });
        }
      });

      /**
       * JQBX: Remove track from queue
       * Event: 'queue:remove_track'
       * Data: { roomId, zingId }
       */
      socket.on('queue:remove_track', async (data) => {
        try {
          const { roomId, zingId } = data;
          if (!roomId || !zingId) {
            socket.emit('error', { message: 'Room ID and zingId are required' });
            return;
          }

          const room = await roomService.removeTrackFromQueue(roomId, zingId, socket.userId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('queue:remove_track', {
            roomId,
            queue: room.queue,
            removedBy: socket.userId,
            removedByUserName: socket.userName,
            zingId,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to remove track from queue' });
        }
      });

      /**
       * JQBX: Play next (tự động khi bài kết thúc)
       * Event: 'queue:play_next'
       * Data: { roomId }
       */
      socket.on('queue:play_next', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            return;
          }

          // Chỉ host mới được trigger
          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room || String(room.hostId || room.ownerId) !== String(socket.userId)) {
            return;
          }

          const nextRoom = await roomService.hostSkip(roomId, socket.userId);
          const syncData = await roomService.getSyncData(roomId);

          // Broadcast to all in room
          this.io.to(`room:${roomId}`).emit('queue:play_next', {
            roomId,
            currentTrack: nextRoom.currentTrack,
            syncData,
            timestamp: Date.now(),
          });
        } catch (error) {
          // Silent fail - có thể không còn bài nào
          console.error('Play next error:', error.message);
        }
      });

      /**
       * JQBX: Update members list
       * Event: 'room:update_members'
       * Data: { roomId }
       */
      socket.on('room:update_members', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            return;
          }

          const room = await Room.findOne({ roomId, isActive: true }).lean();
          if (!room) {
            return;
          }

          // Broadcast updated members list
          this.io.to(`room:${roomId}`).emit('room:update_members', {
            roomId,
            members: room.members || [],
            memberCount: room.memberCount,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Update members error:', error.message);
        }
      });

      // ===== DJ ROTATION EVENTS =====

      /**
       * DJ: Add track to queue
       * Event: 'dj:add_track'
       * Data: { roomId, zingId }
       */
      socket.on('dj:add_track', async (data) => {
        try {
          const { roomId, zingId } = data;
          if (!roomId || !zingId) {
            socket.emit('error', { message: 'Room ID and zingId are required' });
            return;
          }

          const room = await djRotationService.addTrackToDjQueue(roomId, socket.userId, zingId);

          // Emit DJ list update
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);

          // Emit queue update
          this.io.to(`room:${roomId}`).emit('queue:update', {
            roomId,
            djs: room.djs,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to add track to DJ queue' });
        }
      });

      /**
       * DJ: Remove track from queue
       * Event: 'dj:remove_track'
       * Data: { roomId, zingId }
       */
      socket.on('dj:remove_track', async (data) => {
        try {
          const { roomId, zingId } = data;
          if (!roomId || !zingId) {
            socket.emit('error', { message: 'Room ID and zingId are required' });
            return;
          }

          const room = await djRotationService.removeTrackFromDjQueue(roomId, socket.userId, zingId);

          // Emit DJ list update
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);

          // Emit queue update
          this.io.to(`room:${roomId}`).emit('queue:update', {
            roomId,
            djs: room.djs,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to remove track from DJ queue' });
        }
      });

      /**
       * DJ: Join rotation
       * Event: 'dj:join'
       * Data: { roomId }
       */
      socket.on('dj:join', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const room = await djRotationService.addDj(roomId, socket.userId, socket.userName);

          // Emit DJ list update
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);

          // Emit rotation state update
          engine.emitRotationStateUpdate(roomId, room);
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to join DJ rotation' });
        }
      });

      /**
       * DJ: Leave rotation
       * Event: 'dj:leave'
       * Data: { roomId }
       */
      socket.on('dj:leave', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const room = await djRotationService.removeDj(roomId, socket.userId);

          // Emit DJ list update
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);

          // Emit rotation state update
          engine.emitRotationStateUpdate(roomId, room);
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to leave DJ rotation' });
        }
      });

      /**
       * Rotation: Skip to next DJ (owner only)
       * Event: 'rotation:skip'
       * Data: { roomId }
       */
      socket.on('rotation:skip', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          // Kiểm tra quyền owner
          const room = await Room.findOne({ roomId, isActive: true });
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          if (String(room.ownerId) !== String(socket.userId)) {
            socket.emit('error', { message: 'Only room owner can skip rotation' });
            return;
          }

          const updatedRoom = await djRotationService.advanceToNextDj(roomId);

          // Emit events
          const engine = getDjRotationEngine(this);
          engine.emitNextDj(roomId, updatedRoom);
          engine.emitRotationStateUpdate(roomId, updatedRoom);

          if (updatedRoom.currentTrack && updatedRoom.currentTrack.zingId) {
            engine.emitTrackStarted(roomId, updatedRoom);
          }
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to skip rotation' });
        }
      });

      /**
       * Rotation: Request sync
       * Event: 'rotation:request_sync'
       * Data: { roomId }
       */
      socket.on('rotation:request_sync', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            return;
          }

          const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' }).lean();
          if (!room || !room.currentTrack || !room.currentTrack.zingId) {
            return;
          }

          // Use centralized sync data utility
          const syncData = getSyncData(room);

          // Gửi sync data cho client (JQBX-style)
          socket.emit('player:sync', {
            roomId,
            ...syncData,
          });

          // Update socket activity
          this.socketActivity.set(socket.id, Date.now());
        } catch (error) {
          console.error('Request sync error:', error.message);
        }
      });

      // ===== VOTE SKIP EVENTS =====

      /**
       * Vote skip bài đang phát
       * Event: 'vote:skip'
       * Data: { roomId }
       */
      socket.on('vote:skip', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const result = await voteSkipService.voteSkip(roomId, socket.userId, socket.userName);

          // Invalidate cache
          this.roomStateCache.invalidate(roomId);

          // Nếu đủ vote, đã skip rồi
          if (result.skipped) {
            // Emit skip passed
            this.io.to(`room:${roomId}`).emit('vote:skip_passed', {
              roomId,
              reason: result.reason,
              timestamp: Date.now(),
            });

            // Emit track started/ended tùy theo mode
            if (result.room) {
              if (result.room.mode === 'dj_rotation') {
                const engine = getDjRotationEngine(this);
                engine.emitRotationStateUpdate(roomId, result.room);
                if (result.room.currentTrack && result.room.currentTrack.zingId) {
                  engine.emitTrackStarted(roomId, result.room);
                }
              } else {
                // Normal mode
                const syncData = await roomService.getSyncData(roomId);
                this.io.to(`room:${roomId}`).emit('player:host_skip', {
                  roomId,
                  currentTrack: result.room.currentTrack,
                  syncData,
                  timestamp: Date.now(),
                });
              }
            }
          } else {
            // Emit vote updated
            this.io.to(`room:${roomId}`).emit('vote:skip_updated', {
              roomId,
              voteCount: result.voteCount,
              threshold: result.threshold,
              hasEnoughVotes: result.hasEnoughVotes,
              needMoreVotes: result.needMoreVotes,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to vote skip' });
        }
      });

      /**
       * Unvote skip
       * Event: 'vote:unskip'
       * Data: { roomId }
       */
      socket.on('vote:unskip', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
          }

          const result = await voteSkipService.unvoteSkip(roomId, socket.userId);

          // Invalidate cache
          this.roomStateCache.invalidate(roomId);

          // Emit vote updated
          this.io.to(`room:${roomId}`).emit('vote:skip_updated', {
            roomId,
            voteCount: result.voteCount,
            threshold: result.threshold,
            hasEnoughVotes: result.hasEnoughVotes,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to unvote skip' });
        }
      });

      /**
       * Get vote skip status
       * Event: 'vote:get_status'
       * Data: { roomId }
       */
      socket.on('vote:get_status', async (data) => {
        try {
          const { roomId } = data;
          if (!roomId) {
            return;
          }

          const status = await voteSkipService.getVoteSkipStatus(roomId);
          socket.emit('vote:skip_status', {
            roomId,
            ...status,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Get vote status error:', error.message);
        }
      });

      // ===== DJ REORDER EVENTS =====

      /**
       * Reorder DJs (owner only)
       * Event: 'dj:reorder'
       * Data: { roomId, newOrder: [userId1, userId2, ...] }
       */
      socket.on('dj:reorder', async (data) => {
        try {
          const { roomId, newOrder } = data;
          if (!roomId || !newOrder || !Array.isArray(newOrder)) {
            socket.emit('error', { message: 'Room ID and newOrder array are required' });
            return;
          }

          const room = await djRotationService.reorderDjs(roomId, socket.userId, newOrder);

          // Invalidate cache
          this.roomStateCache.invalidate(roomId);

          // Emit DJ reordered
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);
          engine.emitRotationStateUpdate(roomId, room);

          this.io.to(`room:${roomId}`).emit('dj:reordered', {
            roomId,
            newOrder,
            djs: room.djs,
            currentDjIndex: room.currentDjIndex,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to reorder DJs' });
        }
      });

      /**
       * Reorder DJ queue
       * Event: 'dj:queue_reorder'
       * Data: { roomId, newOrder: [zingId1, zingId2, ...] }
       */
      socket.on('dj:queue_reorder', async (data) => {
        try {
          const { roomId, newOrder } = data;
          if (!roomId || !newOrder || !Array.isArray(newOrder)) {
            socket.emit('error', { message: 'Room ID and newOrder array are required' });
            return;
          }

          const room = await djRotationService.reorderDjQueue(roomId, socket.userId, newOrder);

          // Invalidate cache
          this.roomStateCache.invalidate(roomId);

          // Emit queue reordered
          const engine = getDjRotationEngine(this);
          engine.emitDjListUpdate(roomId, room);

          this.io.to(`room:${roomId}`).emit('queue:reordered', {
            roomId,
            newOrder,
            djs: room.djs,
            timestamp: Date.now(),
          });
        } catch (error) {
          socket.emit('error', { message: error.message || 'Failed to reorder DJ queue' });
        }
      });

      // ===== DISCONNECT =====

      /**
       * Disconnect handler
       * JQBX-style: Nếu host disconnect, chọn host mới theo thứ tự ưu tiên
       */
      socket.on('disconnect', async () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);

        // Leave room if in one
        const roomId = this.socketRooms.get(socket.id);
        if (roomId) {
          try {
            const room = await Room.findOne({ roomId, isActive: true });
            const wasHost = this.roomHosts.get(roomId) === socket.id;

            // Leave room
            await roomService.leaveRoom(roomId, socket.userId);

            // Nếu là host disconnect, chọn host mới
            if (wasHost && room) {
              this.stopSyncInterval(roomId);
              this.roomHosts.delete(roomId);

              // Tìm host mới: JQBX-style priority
              // 1. If rotation mode and current DJ exists, set host = current DJ userId
              // 2. Else if owner online → owner is new host
              // 3. Else choose first active member (by joinedAt)
              let newHostId = null;

              if (room.mode === 'dj_rotation' && room.currentDjIndex >= 0 && room.djs[room.currentDjIndex]) {
                const currentDj = room.djs[room.currentDjIndex];
                if (currentDj && currentDj.isActive) {
                  newHostId = currentDj.userId;
                }
              }

              if (!newHostId) {
                // Check if owner is online
                const ownerSocket = Array.from(this.io.sockets.sockets.values()).find(
                  (s) => s.userId === room.ownerId && this.socketRooms.get(s.id) === roomId
                );
                if (ownerSocket) {
                  newHostId = room.ownerId;
                } else if (room.members.length > 0) {
                  // Choose first active member (by joinedAt)
                  const activeMembers = room.members.filter(m => {
                    const memberSocket = Array.from(this.io.sockets.sockets.values()).find(
                      (s) => s.userId === m.userId && this.socketRooms.get(s.id) === roomId
                    );
                    return memberSocket;
                  });
                  if (activeMembers.length > 0) {
                    newHostId = activeMembers[0].userId;
                  }
                }
              }

              if (newHostId) {
                // Tìm socket của host mới
                const newHostSocket = Array.from(this.io.sockets.sockets.values()).find(
                  (s) => s.userId === newHostId && this.socketRooms.get(s.id) === roomId
                );

                if (newHostSocket) {
                  this.roomHosts.set(roomId, newHostSocket.id);
                  this.startSyncInterval(roomId, newHostSocket.id);

                  // Emit host changed event
                  this.io.to(`room:${roomId}`).emit('room:host_changed', {
                    roomId,
                    newHostId,
                    newHostName: room.members.find(m => String(m.userId) === String(newHostId))?.userName || 'Unknown',
                    timestamp: Date.now(),
                  });
                }
              }
            }

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
          this.socketActivity.delete(socket.id);
          this.previousSyncPositions.delete(roomId);
        }
      });
    });
  }

  /**
   * Start sync interval for room (host sends sync every 3 seconds - JQBX standard)
   * @param {string} roomId - Room ID
   * @param {string} hostSocketId - Host socket ID
   */
  startSyncInterval(roomId, hostSocketId) {
    // Stop existing interval if any
    this.stopSyncInterval(roomId);

    // Start new interval
    const interval = setInterval(async () => {
      try {
        const room = await Room.findOne({ roomId, isActive: true }).lean();
        if (!room) {
          this.stopSyncInterval(roomId);
          return;
        }

        // Check if host is still connected
        const currentHostSocketId = this.roomHosts.get(roomId);
        if (!currentHostSocketId || currentHostSocketId !== hostSocketId) {
          this.stopSyncInterval(roomId);
          return;
        }

        // Check if room has track playing
        if (!room || !room.currentTrack?.zingId) {
          return; // No track playing
        }

        // Get sync data using centralized utility
        const syncData = getSyncData(room);
        if (!syncData || !syncData.zingId) {
          return;
        }

        // Jitter detection: check if host position has abnormal jumps
        const previousPosition = this.previousSyncPositions.get(roomId);
        if (previousPosition !== undefined) {
          const timeDelta = syncData.timestamp - (previousPosition.timestamp || syncData.timestamp - 3000);
          const isJitter = detectJitter(previousPosition.position, syncData.position, timeDelta);

          if (isJitter) {
            // Host is lagging, send warning to host and authoritative sync to clients
            const hostSocket = this.io.sockets.sockets.get(hostSocketId);
            if (hostSocket) {
              hostSocket.emit('player:host_lagging', {
                roomId,
                message: 'Host sync lagging detected',
                timestamp: syncData.timestamp,
              });
            }
          }
        }

        // Store previous position for next comparison
        this.previousSyncPositions.set(roomId, {
          position: syncData.position,
          timestamp: syncData.timestamp,
        });

        // Broadcast sync to all members (không gửi cho host) - JQBX-style
        const hostSocket = this.io.sockets.sockets.get(hostSocketId);
        if (hostSocket && syncData) {
          hostSocket.to(`room:${roomId}`).emit('player:sync', {
            roomId,
            ...syncData,
          });
        }
      } catch (error) {
        console.error(`Sync interval error for room ${roomId}:`, error.message);
      }
    }, jqbxConfig.sync.heartbeatInterval); // 3 seconds (JQBX standard)

    this.syncIntervals.set(roomId, interval);
  }

  /**
   * Stop sync interval for room
   * @param {string} roomId - Room ID
   */
  stopSyncInterval(roomId) {
    const interval = this.syncIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(roomId);
    }
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
