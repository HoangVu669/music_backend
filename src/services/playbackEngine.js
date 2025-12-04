/**
 * Playback Engine - Background tick loop cho Normal Mode
 * Tự động phát hiện bài hát kết thúc và auto-advance
 */
const Room = require('../models/Room');
const roomService = require('./user/roomService');
const voteSkipService = require('./user/voteSkipService');
const jqbxConfig = require('../config/jqbx');

class PlaybackEngine {
    constructor(socketService = null) {
        this.socketService = socketService;
        this.tickInterval = null;
        this.isRunning = false;
        this.processedRooms = new Set();
        this.roomLocks = new Map(); // In-process locks to prevent double-processing
        this.softEndEmitted = new Set(); // Track which rooms have emitted soft end
        this.autoplayChains = new Map(); // Track consecutive autoplay count per room
    }

    /**
     * Khởi động engine
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Playback Engine đã đang chạy');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Playback Engine đã khởi động');

        // Tick every 500ms (optimized from 1000ms for better track-end detection)
        this.tickInterval = setInterval(() => {
            this.tick().catch((error) => {
                console.error('❌ Playback Engine tick error:', error.message);
            });
        }, jqbxConfig.trackEnd.playbackEngineTick);
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
        console.log('🛑 Playback Engine đã dừng');
    }

    /**
     * Set socket service
     */
    setSocketService(socketService) {
        this.socketService = socketService;
    }

    /**
     * Tick loop - chạy mỗi giây
     */
    async tick() {
        try {
            // Lấy tất cả phòng normal mode đang active và đang play
            const rooms = await Room.find({
                mode: 'normal',
                isActive: true,
                'currentTrack.zingId': { $ne: null },
                isPlaying: true,
            }).lean();

            // Xử lý từng phòng
            for (const room of rooms) {
                if (this.processedRooms.has(room.roomId)) {
                    continue;
                }

                this.processedRooms.add(room.roomId);

                this.processRoom(room).catch((error) => {
                    console.error(`Error processing room ${room.roomId}:`, error.message);
                }).finally(() => {
                    setTimeout(() => {
                        this.processedRooms.delete(room.roomId);
                    }, 2000);
                });
            }
        } catch (error) {
            console.error('Playback Engine tick error:', error.message);
        }
    }

    /**
     * Xử lý một phòng cụ thể
     * Two-phase track-end detection: soft end + hard end
     */
    async processRoom(room) {
        try {
            const currentTrack = room.currentTrack;
            if (!currentTrack || !currentTrack.zingId || !room.isPlaying) {
                // Reset soft end flag if track stopped
                this.softEndEmitted.delete(room.roomId);
                return;
            }

            const now = Date.now();
            const startedAt = currentTrack.startedAt || 0;
            const duration = currentTrack.duration || 0;

            if (startedAt === 0 || duration === 0) {
                return;
            }

            const elapsed = (now - startedAt) / 1000; // seconds (decimal precision)
            const durationSeconds = duration;

            // Phase 1: Soft end - emit track_ending_soon (3s before end)
            const softEndThreshold = durationSeconds - jqbxConfig.trackEnd.softEndOffset;
            if (elapsed >= softEndThreshold && !this.softEndEmitted.has(room.roomId)) {
                this.emitTrackEndingSoon(room.roomId, room);
                this.softEndEmitted.add(room.roomId);
            }

            // Phase 2: Hard end - finalize track end
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
            // Reload room từ DB
            const freshRoom = await Room.findOne({ roomId: room.roomId, isActive: true });
            if (!freshRoom || freshRoom.mode !== 'normal') {
                return;
            }

            // Double-check track hasn't changed
            const currentZingId = freshRoom.currentTrack?.zingId || freshRoom.currentSongId;
            const originalZingId = room.currentTrack?.zingId || room.currentSongId;
            if (currentZingId !== originalZingId) {
                return; // Track changed, skip
            }

            // Reset vote skips
            await voteSkipService.resetVoteSkips(room.roomId);

            // Tìm bài tiếp theo trong queue
            let nextTrack = null;

            if (currentZingId && freshRoom.queue.length > 0) {
                const currentIndex = freshRoom.queue.findIndex(
                    (q) => (q.zingId || q.songId) === currentZingId
                );
                if (currentIndex >= 0 && currentIndex < freshRoom.queue.length - 1) {
                    nextTrack = freshRoom.queue[currentIndex + 1];
                }
            } else if (freshRoom.queue.length > 0) {
                // Chưa có bài nào đang phát, lấy bài đầu tiên
                nextTrack = freshRoom.queue[0];
            }

            // Nếu có bài tiếp theo, play
            if (nextTrack) {
                const zingId = nextTrack.zingId || nextTrack.songId;
                await roomService.hostChangeTrack(room.roomId, freshRoom.hostId || freshRoom.ownerId, zingId);
                // Reset autoplay chain when playing from queue
                this.autoplayChains.delete(room.roomId);
                this.emitTrackStarted(room.roomId);
            } else if (freshRoom.settings?.autoplay) {
                // Autoplay: lấy bài random liên quan từ ZingMP3 (JQBX-style)
                // Check autoplay chain limit
                const currentChain = this.autoplayChains.get(room.roomId) || 0;
                if (currentChain >= jqbxConfig.autoplay.maxConsecutive) {
                    // Max consecutive autoplay reached, stop
                    this.autoplayChains.delete(room.roomId);
                    await this.stopPlayback(room.roomId);
                    return;
                }

                if (currentZingId) {
                    const zingService = require('./zing.service');
                    try {
                        const randomSong = await zingService.getRandomRelatedSong(currentZingId);
                        if (randomSong && randomSong.zingId) {
                            // Play bài random
                            await roomService.hostChangeTrack(room.roomId, freshRoom.hostId || freshRoom.ownerId, randomSong.zingId);
                            // Increment autoplay chain
                            this.autoplayChains.set(room.roomId, currentChain + 1);
                            this.emitTrackStarted(room.roomId);
                        } else {
                            // Không có bài random, reset chain và dừng phát
                            this.autoplayChains.delete(room.roomId);
                            await this.stopPlayback(room.roomId);
                        }
                    } catch (error) {
                        console.error(`Autoplay error for room ${room.roomId}:`, error.message);
                        // Reset chain và dừng phát
                        this.autoplayChains.delete(room.roomId);
                        await this.stopPlayback(room.roomId);
                    }
                } else {
                    this.autoplayChains.delete(room.roomId);
                    await this.stopPlayback(room.roomId);
                }
            } else {
                // Không autoplay, reset chain và dừng phát
                this.autoplayChains.delete(room.roomId);
                await this.stopPlayback(room.roomId);
            }
        } catch (error) {
            console.error(`Error handling track ended for room ${room.roomId}:`, error.message);
        } finally {
            // Release lock after delay
            setTimeout(() => {
                this.roomLocks.delete(room.roomId);
                this.softEndEmitted.delete(room.roomId);
            }, jqbxConfig.locking.inProcessLockTTL);
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
     * Dừng phát
     */
    async stopPlayback(roomId) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            return;
        }

        room.isPlaying = false;
        await room.save();

        this.emitTrackEnded(roomId);
    }

    /**
     * Emit track started
     */
    emitTrackStarted(roomId) {
        if (!this.socketService) {
            return;
        }

        const io = this.socketService.getIO();
        if (!io) {
            return;
        }

        // Emit event để clients biết bài mới bắt đầu
        io.to(`room:${roomId}`).emit('player:track_started', {
            roomId,
            timestamp: Date.now(),
        });
    }

    /**
     * Emit track ended
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
}

// Singleton instance
let engineInstance = null;

function getPlaybackEngine(socketService = null) {
    if (!engineInstance) {
        engineInstance = new PlaybackEngine(socketService);
    } else if (socketService) {
        engineInstance.setSocketService(socketService);
    }
    return engineInstance;
}

module.exports = { PlaybackEngine, getPlaybackEngine };

