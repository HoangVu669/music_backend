/**
 * Coop Service - Cooperative mode service (JQBX-style)
 * In coop mode, all members can control playback and manage queue
 * Vote skip requires 2/3 (66.67%) of active members
 */

const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const AppError = require('../../utils/AppError');
const zingService = require('../zing.service');
const { requirePermission, ACTION, canControlPlayback } = require('../../utils/permissionUtils');
const jqbxConfig = require('../../config/jqbx');

class CoopService {
    /**
     * Create a coop mode room
     * @param {string} ownerId - Owner ID
     * @param {string} ownerName - Owner name
     * @param {Object} data - Room data
     * @returns {Promise<Object>} Created room
     */
    async createCoopRoom(ownerId, ownerName, data = {}) {
        const { name, description, isPrivate = false, maxMembers = 50 } = data;

        if (!name || name.trim().length === 0) {
            throw new AppError('VALIDATION_ERROR', 'Tên phòng không được để trống');
        }

        if (maxMembers < 2 || maxMembers > 100) {
            throw new AppError('VALIDATION_ERROR', 'Số thành viên tối đa phải từ 2 đến 100');
        }

        const { generateUniqueRandomId } = require('../../utils/generateId');
        const room = await Room.create({
            roomId: await generateUniqueRandomId(Room, 'roomId'),
            name: name.trim(),
            description: description?.trim() || '',
            hostId: String(ownerId), // Still have hostId for backward compatibility
            ownerId: String(ownerId),
            ownerName,
            members: [{ userId: String(ownerId), userName: ownerName }],
            memberCount: 1,
            isPrivate: Boolean(isPrivate),
            isPublic: !Boolean(isPrivate),
            maxMembers: parseInt(maxMembers),
            isActive: true,
            mode: 'coop', // COOP mode
            pendingRequests: [],
            settings: {
                autoplay: true,
                allowMemberSkip: true, // All members can skip via vote
                allowMemberAddTrack: true, // All members can add tracks
                strictSync: true,
            },
            currentTrack: {
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
                mode: 'coop',
            },
            queue: [], // Shared queue for all members
            voteSkipThreshold: 0.6667, // 2/3 for coop mode
            voteSkipEnabled: true,
        });

        // Log activity
        await RoomActivity.create({
            roomId: room.roomId,
            userId: ownerId,
            userName: ownerName,
            activityType: 'ROOM_CREATED',
            metadata: { mode: 'coop' },
        });

        return this._formatRoomResponse(room, ownerId);
    }

    /**
     * Play track (any member can play in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated room
     */
    async play(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, userId, ACTION.PLAY);

        // Nếu chưa có currentTrack, lấy từ queue
        if (!room.currentTrack?.zingId && room.queue.length > 0) {
            const firstTrack = room.queue[0];
            await this.changeTrack(roomId, userId, firstTrack.zingId || firstTrack.songId);
            return await Room.findOne({ roomId, isActive: true });
        }

        if (!room.currentTrack?.zingId) {
            throw new AppError('NO_TRACK', 'Không có bài hát để phát');
        }

        // Cập nhật startedAt = now nếu chưa có hoặc đang pause
        const now = Date.now();
        if (!room.currentTrack.startedAt || !room.isPlaying) {
            room.currentTrack.startedAt = now;
            room.currentTrack.position = 0;
        }

        room.isPlaying = true;
        room.currentTrack.isPlaying = true;
        room.lastSyncAt = new Date();
        await room.save();

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Pause track (any member can pause in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated room
     */
    async pause(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, userId, ACTION.PAUSE);

        // Freeze position
        if (room.currentTrack?.startedAt && room.isPlaying) {
            const now = Date.now();
            const elapsed = (now - room.currentTrack.startedAt) / 1000;
            room.currentTrack.position = Math.min(
                Math.max(0, elapsed),
                room.currentTrack.duration || 0
            );
        }

        room.isPlaying = false;
        if (room.currentTrack) {
            room.currentTrack.isPlaying = false;
        }
        room.lastSyncAt = new Date();
        await room.save();

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Seek to position (any member can seek in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @param {number} position - Position in seconds
     * @returns {Promise<Object>} Updated room
     */
    async seek(roomId, userId, position) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, userId, ACTION.SEEK);

        if (!room.currentTrack?.zingId) {
            throw new AppError('NO_TRACK', 'Không có bài hát đang phát');
        }

        const duration = room.currentTrack.duration || 0;
        const newPosition = Math.max(0, Math.min(position, duration));

        // Update startedAt để position calculation đúng
        const now = Date.now();
        room.currentTrack.startedAt = now - (newPosition * 1000);
        room.currentTrack.position = newPosition;
        room.lastSyncAt = new Date();
        await room.save();

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Skip to next track (any member can skip via vote in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated room
     */
    async skip(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        // In coop mode, skip requires vote (2/3 threshold)
        // Direct skip is not allowed, must use vote skip
        requirePermission(room, userId, ACTION.SKIP);

        // If user can control playback (owner/host), allow direct skip
        if (canControlPlayback(room, userId)) {
            return await this._skipToNext(roomId, userId);
        }

        // Otherwise, use vote skip
        const voteSkipService = require('./voteSkipService');
        return await voteSkipService.voteSkip(roomId, userId, room.members.find(m => String(m.userId) === String(userId))?.userName || 'Unknown');
    }

    /**
     * Change track (any member can change track in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} userId - User ID
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Updated room
     */
    async changeTrack(roomId, userId, zingId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, userId, ACTION.CHANGE_TRACK);

        // Lấy thông tin bài hát từ ZingMP3
        let songData;
        try {
            songData = await zingService.getFullSongData(zingId);
        } catch (error) {
            throw new AppError('SONG_NOT_FOUND', `Không tìm thấy bài hát: ${error.message}`);
        }

        // Cập nhật currentTrack
        const now = Date.now();
        room.currentTrack = {
            zingId: songData.zingId,
            title: songData.title,
            artist: songData.artist,
            artists: songData.artists || songData.artist,
            thumbnail: songData.thumbnail,
            duration: songData.duration,
            startedAt: now,
            position: 0,
            streamingUrl: songData.streamingUrl,
            isPlaying: room.isPlaying || false,
            djUserId: null,
            queuedBy: String(userId),
            mode: 'coop',
        };

        // Reset vote skips
        room.voteSkips = [];

        room.lastSyncAt = new Date();
        await room.save();

        // Log activity
        const user = room.members.find((m) => String(m.userId) === String(userId));
        await RoomActivity.create({
            roomId,
            userId,
            userName: user?.userName || 'Unknown',
            activityType: 'SONG_STARTED',
            metadata: { zingId, mode: 'coop' },
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Add track to shared queue (any member can add in coop mode)
     * @param {string} roomId - Room ID
     * @param {string} zingId - ZingMP3 song ID
     * @param {string} addedBy - User ID
     * @returns {Promise<Object>} Updated room
     */
    async addTrackToQueue(roomId, zingId, addedBy) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, addedBy, ACTION.ADD_TRACK);

        // Kiểm tra đã có trong queue chưa
        const existing = room.queue.find((q) => (q.zingId || q.songId) === zingId);
        if (existing) {
            throw new AppError('ALREADY_IN_QUEUE', 'Bài hát đã có trong danh sách phát');
        }

        // Lấy thông tin bài hát từ ZingMP3
        let songData;
        try {
            songData = await zingService.getSongInfo(zingId);
        } catch (error) {
            throw new AppError('SONG_NOT_FOUND', `Không tìm thấy bài hát: ${error.message}`);
        }

        // Thêm vào queue
        const maxOrder = room.queue.length > 0 ? Math.max(...room.queue.map((q) => q.order || 0)) : 0;
        room.queue.push({
            zingId: zingId,
            songId: zingId,
            title: songData.title,
            artist: songData.artist,
            thumbnail: songData.thumbnail,
            duration: songData.duration,
            addedBy: String(addedBy),
            order: maxOrder + 1,
            addedAt: new Date(),
        });

        await room.save();

        // Log activity
        const user = room.members.find((m) => String(m.userId) === String(addedBy));
        await RoomActivity.create({
            roomId,
            userId: addedBy,
            userName: user?.userName || 'Unknown',
            activityType: 'SONG_ADDED',
            metadata: { zingId, mode: 'coop' },
        });

        return this._formatRoomResponse(room, addedBy);
    }

    /**
     * Remove track from shared queue
     * @param {string} roomId - Room ID
     * @param {string} zingId - ZingMP3 song ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated room
     */
    async removeTrackFromQueue(roomId, zingId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải coop mode');
        }

        requirePermission(room, userId, ACTION.REMOVE_TRACK);

        const trackIndex = room.queue.findIndex((q) => (q.zingId || q.songId) === zingId);
        if (trackIndex === -1) {
            throw new AppError('NOT_FOUND', 'Bài hát không có trong danh sách phát');
        }

        room.queue.splice(trackIndex, 1);
        await room.save();

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Skip to next track in queue (internal method)
     * @private
     */
    async _skipToNext(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'coop' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Tìm bài tiếp theo trong queue
        if (room.queue.length > 0) {
            const nextTrack = room.queue[0];
            room.queue.shift(); // Remove from queue
            await this.changeTrack(roomId, userId, nextTrack.zingId || nextTrack.songId);
            return await Room.findOne({ roomId, isActive: true });
        }

        // Nếu queue rỗng, autoplay
        if (room.settings?.autoplay && room.currentTrack?.zingId) {
            // Autoplay logic (similar to normal mode)
            const playbackEngine = require('../playbackEngine').getPlaybackEngine();
            // Let playback engine handle autoplay
            return await Room.findOne({ roomId, isActive: true });
        }

        // No next track
        room.isPlaying = false;
        if (room.currentTrack) {
            room.currentTrack.isPlaying = false;
        }
        await room.save();

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Format room response
     * @private
     */
    _formatRoomResponse(room, userId) {
        return {
            roomId: room.roomId,
            name: room.name,
            description: room.description,
            ownerId: room.ownerId,
            ownerName: room.ownerName,
            hostId: room.hostId,
            mode: room.mode,
            members: room.members || [],
            memberCount: room.memberCount || 0,
            currentTrack: room.currentTrack || null,
            queue: room.queue || [],
            isPlaying: room.isPlaying || false,
            settings: room.settings || {},
            voteSkipThreshold: room.voteSkipThreshold || 0.6667,
            voteSkipEnabled: room.voteSkipEnabled !== false,
            isPrivate: room.isPrivate || false,
            isPublic: room.isPublic !== false,
            maxMembers: room.maxMembers || 50,
            isActive: room.isActive !== false,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
        };
    }
}

module.exports = new CoopService();

