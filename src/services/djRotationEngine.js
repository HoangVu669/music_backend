/**
 * DJ Rotation Engine - Background tick loop để tự động chuyển bài và DJ
 * Chạy mỗi giây để kiểm tra bài hát đã kết thúc chưa và auto-advance
 */
const Room = require('../models/Room');
const djRotationService = require('./user/djRotationService');
const jqbxConfig = require('../config/jqbx');

class DjRotationEngine {
    constructor(socketService = null) {
        this.socketService = socketService;
        this.tickInterval = null;
        this.isRunning = false;
        this.processedRooms = new Set(); // Track rooms đang được xử lý để tránh race condition
        this.roomLocks = new Map(); // In-process locks to prevent double-processing
        this.softEndEmitted = new Set(); // Track which rooms have emitted soft end
        this.prepareNextEmitted = new Set(); // Track which rooms have emitted prepare-next
    }

    /**
     * Khởi động engine
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ DJ Rotation Engine đã đang chạy');
            return;
        }

        this.isRunning = true;
        console.log('🚀 DJ Rotation Engine đã khởi động');

        // Tick every 250ms (JQBX requirement for rotation engine)
        this.tickInterval = setInterval(() => {
            this.tick().catch((error) => {
                console.error('❌ DJ Rotation Engine tick error:', error.message);
            });
        }, jqbxConfig.trackEnd.rotationEngineTick);
    }

    /**
     * Dừng engine
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        console.log('🛑 DJ Rotation Engine đã dừng');
    }

    /**
     * Set socket service để emit events
     */
    setSocketService(socketService) {
        this.socketService = socketService;
    }

    /**
     * Tick loop - chạy mỗi 250ms
     */
    async tick() {
        try {
            // Lấy tất cả phòng đang ở DJ rotation mode và đang active
            const rooms = await Room.find({
                mode: 'dj_rotation',
                isActive: true,
            }).lean();

            // Process idle detection for all rotation rooms (non-blocking)
            for (const room of rooms) {
                this.checkIdleDjs(room).catch((error) => {
                    console.error(`Error checking idle DJs for room ${room.roomId}:`, error.message);
                });
            }

            // Process track-end detection for playing rooms
            const playingRooms = rooms.filter(r => r.currentTrack?.zingId && r.isPlaying);

            // Xử lý từng phòng
            for (const room of playingRooms) {
                // Tránh xử lý cùng lúc (race condition)
                if (this.processedRooms.has(room.roomId)) {
                    continue;
                }

                this.processedRooms.add(room.roomId);

                // Xử lý async, không block
                this.processRoom(room).catch((error) => {
                    console.error(`Error processing room ${room.roomId}:`, error.message);
                }).finally(() => {
                    // Xóa khỏi processed set sau 2 giây (đảm bảo không bị stuck)
                    setTimeout(() => {
                        this.processedRooms.delete(room.roomId);
                    }, 2000);
                });
            }
        } catch (error) {
            console.error('DJ Rotation Engine tick error:', error.message);
        }
    }

    /**
     * Xử lý một phòng cụ thể
     * Two-phase track-end detection: soft end + hard end + prepare-next
     */
    async processRoom(room) {
        try {
            const currentTrack = room.currentTrack;
            if (!currentTrack || !currentTrack.zingId || !room.isPlaying) {
                // Reset flags if track stopped
                this.softEndEmitted.delete(room.roomId);
                this.prepareNextEmitted.delete(room.roomId);
                return;
            }

            // Tính thời gian đã phát
            const now = Date.now();
            const startedAt = currentTrack.startedAt || 0;
            const duration = currentTrack.duration || 0;

            if (startedAt === 0 || duration === 0) {
                return;
            }

            const elapsed = (now - startedAt) / 1000; // seconds (decimal precision)
            const durationSeconds = duration;

            // Phase 1: Prepare-next - emit 3s before end to DJ
            const prepareNextThreshold = durationSeconds - jqbxConfig.djRotation.prepareNextOffset;
            if (elapsed >= prepareNextThreshold && !this.prepareNextEmitted.has(room.roomId)) {
                this.emitPrepareNextTrack(room.roomId, room);
                this.prepareNextEmitted.add(room.roomId);
            }

            // Phase 2: Soft end - emit track_ending_soon
            const softEndThreshold = durationSeconds - jqbxConfig.trackEnd.softEndOffset;
            if (elapsed >= softEndThreshold && !this.softEndEmitted.has(room.roomId)) {
                this.emitTrackEndingSoon(room.roomId, room);
                this.softEndEmitted.add(room.roomId);
            }

            // Phase 3: Hard end - finalize track end
            const hardEndThreshold = durationSeconds - jqbxConfig.trackEnd.hardEndTolerance;
            if (elapsed >= hardEndThreshold) {
                await this.handleTrackEnded(room);
            }
        } catch (error) {
            console.error(`Error processing room ${room.roomId}:`, error.message);
        }
    }

    /**
     * Xử lý khi bài hát kết thúc
     * Uses locking to prevent double-processing
     */
    async handleTrackEnded(room) {
        // Check lock to prevent double-processing
        if (this.roomLocks.has(room.roomId)) {
            return; // Already processing
        }

        // Acquire lock
        this.roomLocks.set(room.roomId, true);

        try {
            // Reload room từ DB để có data mới nhất
            const freshRoom = await Room.findOne({ roomId: room.roomId, isActive: true });
            if (!freshRoom || freshRoom.mode !== 'dj_rotation') {
                return;
            }

            // Double-check track hasn't changed
            const currentZingId = freshRoom.currentTrack?.zingId;
            const originalZingId = room.currentTrack?.zingId;
            if (currentZingId !== originalZingId) {
                return; // Track changed, skip
            }

            const currentDjIndex = freshRoom.currentDjIndex;
            if (currentDjIndex === -1) {
                return;
            }

            const currentDj = freshRoom.djs[currentDjIndex];
            if (!currentDj || !currentDj.isActive) {
                // DJ không còn active, chuyển sang DJ tiếp theo
                await this.advanceToNextDj(freshRoom);
                return;
            }

            // Kiểm tra DJ còn bài không
            if (currentDj.nextTrackIndex >= currentDj.trackQueue.length) {
                // DJ hết bài, chuyển sang DJ tiếp theo
                if (freshRoom.rotationSettings.autoAdvanceDJ) {
                    await this.advanceToNextDj(freshRoom);
                } else {
                    // Không auto advance, dừng phát
                    freshRoom.isPlaying = false;
                    freshRoom.currentTrack = {
                        zingId: null,
                        title: null,
                        artist: null,
                        artists: null,
                        thumbnail: null,
                        duration: 0,
                        startedAt: 0,
                        position: 0,
                        streamingUrl: null,
                        isPlaying: false,
                        djUserId: null,
                        queuedBy: null,
                        mode: 'rotation',
                    };
                    await freshRoom.save();

                    // Emit event
                    this.emitTrackEnded(freshRoom.roomId);
                }
                return;
            }

            // DJ còn bài, load bài tiếp theo
            await djRotationService.loadNextTrackForDj(freshRoom, currentDjIndex);

            // Emit events
            this.emitTrackStarted(freshRoom.roomId, freshRoom);
            this.emitRotationStateUpdate(freshRoom.roomId, freshRoom);
        } catch (error) {
            console.error(`Error handling track ended for room ${room.roomId}:`, error.message);
        } finally {
            // Release lock after delay
            setTimeout(() => {
                this.roomLocks.delete(room.roomId);
                this.softEndEmitted.delete(room.roomId);
                this.prepareNextEmitted.delete(room.roomId);
            }, jqbxConfig.locking.inProcessLockTTL);
        }
    }

    /**
     * Emit prepare-next track (3s before end to DJ)
     */
    emitPrepareNextTrack(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        const currentDj = room.djs && room.djs[room.currentDjIndex];
        if (currentDj) {
            // Emit to current DJ only
            io.to(`room:${roomId}`).emit('rotation:prepare_next_track', {
                roomId,
                currentDj: {
                    userId: currentDj.userId,
                    userName: currentDj.userName,
                },
                currentTrack: room.currentTrack,
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Emit track ending soon (soft end)
     */
    emitTrackEndingSoon(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        io.to(`room:${roomId}`).emit('player:track_ending_soon', {
            roomId,
            currentTrack: room.currentTrack,
            timestamp: Date.now(),
        });
    }

    /**
     * Check idle DJs and auto-kick if needed
     */
    async checkIdleDjs(room) {
        try {
            // Reload room to get fresh data
            const freshRoom = await Room.findOne({ roomId: room.roomId, isActive: true });
            if (!freshRoom || freshRoom.mode !== 'dj_rotation') return;

            const idleTimeout = freshRoom.rotationSettings?.idleTimeout || jqbxConfig.djRotation.idleTimeout;
            const now = Date.now();
            let needsSave = false;

            for (let i = 0; i < freshRoom.djs.length; i++) {
                const dj = freshRoom.djs[i];
                if (!dj.isActive) continue;

                // Check if DJ has no queue activity
                const hasQueue = dj.trackQueue && dj.trackQueue.length > 0;
                const lastActive = dj.lastActiveAt ? new Date(dj.lastActiveAt).getTime() : dj.joinedAt ? new Date(dj.joinedAt).getTime() : now;
                const idleTime = now - lastActive;

                if (!hasQueue && idleTime > idleTimeout) {
                    // DJ is idle and should be auto-kicked
                    const wasCurrentDj = freshRoom.currentDjIndex === i;
                    freshRoom.djs[i].isActive = false;
                    needsSave = true;

                    // Emit rotation:dj_inactive event
                    this.emitDjInactive(freshRoom.roomId, {
                        userId: dj.userId,
                        userName: dj.userName,
                        reason: 'IDLE_TIMEOUT',
                    });

                    // If was current DJ, advance to next
                    if (wasCurrentDj) {
                        await freshRoom.save();
                        await this.advanceToNextDj(freshRoom);
                        return; // Exit early, advanceToNextDj will handle state
                    }
                } else if (hasQueue && dj.idleSince) {
                    // Reset idle if DJ has activity
                    freshRoom.djs[i].idleSince = null;
                    needsSave = true;
                }
            }

            if (needsSave) {
                await freshRoom.save();
            }
        } catch (error) {
            console.error(`Error checking idle DJs for room ${room.roomId}:`, error.message);
        }
    }

    /**
     * Chuyển sang DJ tiếp theo
     */
    async advanceToNextDj(room) {
        try {
            const updatedRoom = await djRotationService.advanceToNextDj(room.roomId);

            // Emit events
            this.emitNextDj(room.roomId, updatedRoom);
            this.emitRotationStateUpdate(room.roomId, updatedRoom);

            // Nếu có bài mới, emit track started
            if (updatedRoom.currentTrack && updatedRoom.currentTrack.zingId) {
                this.emitTrackStarted(room.roomId, updatedRoom);
            } else {
                // No track - emit rotation:idle
                this.emitRotationIdle(room.roomId, updatedRoom);
            }
        } catch (error) {
            console.error(`Error advancing to next DJ for room ${room.roomId}:`, error.message);
        }
    }

    /**
     * Emit event: track started
     */
    emitTrackStarted(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        const syncData = {
            trackId: room.currentTrack?.zingId, // JQBX-style
            zingId: room.currentTrack?.zingId, // Keep for compatibility
            position: 0,
            isPlaying: true,
            timestamp: Date.now(),
            startedAt: room.currentTrack?.startedAt,
            duration: room.currentTrack?.duration,
            djUserId: room.currentTrack?.djUserId,
            title: room.currentTrack?.title,
            artist: room.currentTrack?.artist || room.currentTrack?.artists,
            thumbnail: room.currentTrack?.thumbnail,
        };

        io.to(`room:${roomId}`).emit('player:track_started', {
            roomId,
            currentTrack: room.currentTrack,
            syncData,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: track ended
     */
    emitTrackEnded(roomId) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        io.to(`room:${roomId}`).emit('player:track_ended', {
            roomId,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: next DJ
     */
    emitNextDj(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        const currentDj = room.djs && room.djs[room.currentDjIndex];
        io.to(`room:${roomId}`).emit('rotation:next_dj', {
            roomId,
            currentDjIndex: room.currentDjIndex,
            currentDj: currentDj ? {
                userId: currentDj.userId,
                userName: currentDj.userName,
            } : null,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: rotation state update
     */
    emitRotationStateUpdate(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        const state = djRotationService._formatRoomResponse(room, null);
        io.to(`room:${roomId}`).emit('rotation:state_update', {
            roomId,
            ...state,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: rotation idle (no DJs with tracks)
     */
    emitRotationIdle(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        io.to(`room:${roomId}`).emit('rotation:idle', {
            roomId,
            message: 'No active DJs with tracks',
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: DJ inactive
     */
    emitDjInactive(roomId, dj) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        io.to(`room:${roomId}`).emit('rotation:dj_inactive', {
            roomId,
            dj,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit event: DJ list update
     */
    emitDjListUpdate(roomId, room) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        const djs = room.djs?.filter((dj) => dj.isActive).map((dj) => ({
            userId: dj.userId,
            userName: dj.userName,
            trackQueue: dj.trackQueue || [],
            nextTrackIndex: dj.nextTrackIndex || 0,
            isActive: dj.isActive,
            joinedAt: dj.joinedAt,
        })) || [];

        io.to(`room:${roomId}`).emit('rotation:dj_list_update', {
            roomId,
            djs,
            currentDjIndex: room.currentDjIndex,
            timestamp: Date.now(),
        });
    }
}

// Singleton instance
let engineInstance = null;

function getDjRotationEngine(socketService = null) {
    if (!engineInstance) {
        engineInstance = new DjRotationEngine(socketService);
    } else if (socketService) {
        engineInstance.setSocketService(socketService);
    }
    return engineInstance;
}

module.exports = { DjRotationEngine, getDjRotationEngine };

