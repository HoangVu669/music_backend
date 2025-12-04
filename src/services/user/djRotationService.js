/**
 * DJ Rotation Service - Quản lý DJ Rotation Mode (JQBX-style)
 * Xử lý logic DJ queue, rotation, và track management
 */
const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const zingService = require('../zing.service');
const jqbxConfig = require('../../config/jqbx');
const AppError = require('../../utils/AppError');

class DjRotationService {
    /**
     * Tạo phòng với DJ Rotation mode
     * @param {string} ownerId - ID chủ phòng
     * @param {string} ownerName - Tên chủ phòng
     * @param {Object} data - Thông tin phòng
     * @returns {Promise<Object>} Room đã tạo
     */
    async createRotationRoom(ownerId, ownerName, data = {}) {
        const { name, description, isPrivate = false, maxMembers = 50, rotationSettings = {} } = data;

        if (!name || name.trim().length === 0) {
            throw new AppError('VALIDATION_ERROR', 'Tên phòng không được để trống');
        }

        const room = await Room.create({
            roomId: await require('../../utils/generateId').generateUniqueRandomId(Room, 'roomId'),
            name: name.trim(),
            description: description?.trim() || '',
            hostId: String(ownerId),
            ownerId: String(ownerId),
            ownerName,
            members: [{ userId: String(ownerId), userName: ownerName }],
            memberCount: 1,
            isPrivate: Boolean(isPrivate),
            isPublic: !Boolean(isPrivate),
            maxMembers: parseInt(maxMembers),
            isActive: true,
            mode: 'dj_rotation',
            djs: [],
            currentDjIndex: -1,
            rotationSettings: {
                maxDjSlots: rotationSettings.maxDjSlots || 10,
                allowGuestsToJoinDJ: rotationSettings.allowGuestsToJoinDJ !== undefined ? rotationSettings.allowGuestsToJoinDJ : true,
                autoAdvanceDJ: rotationSettings.autoAdvanceDJ !== undefined ? rotationSettings.autoAdvanceDJ : true,
                strictSync: rotationSettings.strictSync !== undefined ? rotationSettings.strictSync : true,
            },
            currentTrack: {
                zingId: null,
                title: null,
                artist: null,
                thumbnail: null,
                duration: 0,
                startedAt: 0,
                position: 0,
                streamingUrl: null,
                djUserId: null,
            },
            settings: {
                autoplay: true,
                allowMemberSkip: false,
                allowMemberAddTrack: true,
                strictSync: true,
            },
        });

        // Thêm owner làm DJ đầu tiên
        await this.addDj(room.roomId, ownerId, ownerName);

        // Log activity
        await RoomActivity.create({
            roomId: room.roomId,
            userId: ownerId,
            userName: ownerName,
            activityType: 'ROOM_CREATED',
            metadata: { mode: 'dj_rotation' },
        });

        return this._formatRoomResponse(room, ownerId);
    }

    /**
     * Thêm DJ vào rotation
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID người dùng
     * @param {string} userName - Tên người dùng
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async addDj(roomId, userId, userName) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải DJ rotation mode');
        }

        // Kiểm tra quyền sử dụng permission system
        const { requirePermission, ACTION } = require('../../utils/permissionUtils');
        requirePermission(room, userId, ACTION.JOIN_DJ);

        const userIdString = String(userId);

        // Kiểm tra đã là DJ chưa
        const existingDj = room.djs.find((dj) => String(dj.userId) === userIdString);
        if (existingDj) {
            throw new AppError('ALREADY_DJ', 'Bạn đã là DJ trong phòng này');
        }

        // Kiểm tra số lượng DJ slots
        const activeDjs = room.djs.filter((dj) => dj.isActive);
        if (activeDjs.length >= room.rotationSettings.maxDjSlots) {
            // Add to waitlist if full
            const existingWaitlist = room.djWaitlist?.find((w) => String(w.userId) === userIdString);
            if (!existingWaitlist) {
                if (!room.djWaitlist) {
                    room.djWaitlist = [];
                }
                room.djWaitlist.push({
                    userId: userIdString,
                    userName,
                    requestedAt: new Date(),
                });
                await room.save();
            }
            throw new AppError('DJ_SLOTS_FULL', 'Đã đạt số lượng DJ tối đa. Bạn đã được thêm vào danh sách chờ.');
        }

        // Kiểm tra quyền (nếu không cho phép guest join)
        const isMember = room.members.some((m) => String(m.userId) === userIdString);
        if (!room.rotationSettings.allowGuestsToJoinDJ && !isMember) {
            throw new AppError('FORBIDDEN', 'Bạn phải là thành viên phòng để tham gia DJ rotation');
        }

        // Remove from waitlist if exists
        if (room.djWaitlist && Array.isArray(room.djWaitlist)) {
            room.djWaitlist = room.djWaitlist.filter((w) => String(w.userId) !== userIdString);
        }

        // Thêm DJ với order
        const maxOrder = room.djs.length > 0 ? Math.max(...room.djs.map((dj) => dj.order || 0)) : -1;
        room.djs.push({
            userId: userIdString,
            userName,
            order: maxOrder + 1,
            trackQueue: [],
            nextTrackIndex: 0,
            isActive: true,
            joinedAt: new Date(),
            lastActiveAt: new Date(),
            idleSince: null,
        });

        // Cập nhật djOrder
        if (!room.djOrder || !Array.isArray(room.djOrder)) {
            room.djOrder = [];
        }
        room.djOrder.push(userIdString);

        // Nếu chưa có DJ nào đang phát, set làm DJ đầu tiên
        if (room.currentDjIndex === -1 && room.djs.length === 1) {
            room.currentDjIndex = 0;
        }

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName,
            activityType: 'DJ_JOINED',
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Xóa DJ khỏi rotation
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID người dùng
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async removeDj(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra quyền sử dụng permission system
        const { requirePermission, ACTION } = require('../../utils/permissionUtils');
        requirePermission(room, userId, ACTION.LEAVE_DJ);

        const userIdString = String(userId);
        const djIndex = room.djs.findIndex((dj) => String(dj.userId) === userIdString && dj.isActive);

        if (djIndex === -1) {
            throw new AppError('NOT_DJ', 'Bạn không phải DJ trong phòng này');
        }

        const wasCurrentDj = room.currentDjIndex === djIndex;

        // Xóa DJ (set isActive = false thay vì xóa hẳn để giữ lịch sử)
        room.djs[djIndex].isActive = false;

        // Cập nhật djOrder (xóa khỏi order)
        if (room.djOrder && Array.isArray(room.djOrder)) {
            room.djOrder = room.djOrder.filter(id => String(id) !== userIdString);
        }

        // Nếu là DJ đang phát, cần chuyển sang DJ tiếp theo
        if (wasCurrentDj) {
            const nextDjIndex = this._getNextActiveDjIndex(room, djIndex);
            room.currentDjIndex = nextDjIndex;

            // Nếu có DJ tiếp theo, load bài của họ
            if (nextDjIndex !== -1) {
                await this.loadNextTrackForDj(room, nextDjIndex);
            } else {
                // Không còn DJ nào, dừng phát
                room.currentTrack = {
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
                room.isPlaying = false;
            }
        } else {
            // Điều chỉnh currentDjIndex nếu cần
            if (room.currentDjIndex > djIndex) {
                room.currentDjIndex -= 1;
            }
        }

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName: room.djs[djIndex].userName,
            activityType: 'DJ_LEFT',
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Thêm bài hát vào queue của DJ
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID DJ
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async addTrackToDjQueue(roomId, userId, zingId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra quyền sử dụng permission system
        const { requirePermission, ACTION } = require('../../utils/permissionUtils');
        requirePermission(room, userId, ACTION.ADD_DJ_TRACK);

        const userIdString = String(userId);
        const dj = room.djs.find((d) => String(d.userId) === userIdString && d.isActive);

        if (!dj) {
            throw new AppError('NOT_DJ', 'Bạn không phải DJ trong phòng này');
        }

        // Kiểm tra đã có trong queue chưa
        const existing = dj.trackQueue.find((t) => t.zingId === zingId);
        if (existing) {
            throw new AppError('ALREADY_IN_QUEUE', 'Bài hát đã có trong queue của bạn');
        }

        // Lấy thông tin bài hát từ ZingMP3
        let songData;
        try {
            songData = await zingService.getFullSongData(zingId);
        } catch (error) {
            throw new AppError('SONG_NOT_FOUND', `Không tìm thấy bài hát: ${error.message}`);
        }

        // Thêm vào queue
        dj.trackQueue.push({
            zingId: songData.zingId,
            title: songData.title,
            artist: songData.artist,
            thumbnail: songData.thumbnail,
            duration: songData.duration,
            streamingUrl: songData.streamingUrl,
            addedAt: new Date(),
        });

        // Update lastActiveAt (reset idle)
        dj.lastActiveAt = new Date();
        dj.idleSince = null;

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName: dj.userName,
            activityType: 'DJ_TRACK_ADDED',
            metadata: { zingId },
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Xóa bài hát khỏi queue của DJ
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID DJ
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async removeTrackFromDjQueue(roomId, userId, zingId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra quyền sử dụng permission system
        const { requirePermission, ACTION } = require('../../utils/permissionUtils');
        requirePermission(room, userId, ACTION.REMOVE_DJ_TRACK);

        const userIdString = String(userId);
        const dj = room.djs.find((d) => String(d.userId) === userIdString && d.isActive);

        if (!dj) {
            throw new AppError('NOT_DJ', 'Bạn không phải DJ trong phòng này');
        }

        const trackIndex = dj.trackQueue.findIndex((t) => t.zingId === zingId);
        if (trackIndex === -1) {
            throw new AppError('NOT_FOUND', 'Bài hát không có trong queue của bạn');
        }

        // Xóa bài hát
        dj.trackQueue.splice(trackIndex, 1);

        // Điều chỉnh nextTrackIndex nếu cần
        if (trackIndex < dj.nextTrackIndex) {
            dj.nextTrackIndex -= 1;
        } else if (trackIndex === dj.nextTrackIndex && dj.nextTrackIndex >= dj.trackQueue.length) {
            dj.nextTrackIndex = Math.max(0, dj.trackQueue.length - 1);
        }

        // Update lastActiveAt (reset idle)
        dj.lastActiveAt = new Date();
        dj.idleSince = null;

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName: dj.userName,
            activityType: 'DJ_TRACK_REMOVED',
            metadata: { zingId },
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Chuyển sang DJ tiếp theo
     * @param {string} roomId - ID phòng
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async advanceToNextDj(roomId) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        const nextDjIndex = this._getNextActiveDjIndex(room, room.currentDjIndex);

        if (nextDjIndex === -1) {
            // Không còn DJ nào hoặc tất cả DJs đều empty
            // Check if autoplay fallback is enabled
            if (room.rotationSettings.allowAutoplayFallback && room.currentTrack?.zingId) {
                // Try autoplay
                try {
                    const randomSong = await zingService.getRandomRelatedSong(room.currentTrack.zingId);
                    if (randomSong && randomSong.zingId) {
                        // Play autoplay track
                        const now = Date.now();
                        room.currentTrack = {
                            zingId: randomSong.zingId,
                            title: randomSong.title,
                            artist: randomSong.artist,
                            artists: randomSong.artist,
                            thumbnail: randomSong.thumbnail,
                            duration: randomSong.duration,
                            startedAt: now,
                            position: 0,
                            streamingUrl: randomSong.streamingUrl,
                            isPlaying: true,
                            djUserId: null,
                            queuedBy: null,
                            mode: 'rotation',
                        };
                        room.isPlaying = true;
                        await room.save();
                        return this._formatRoomResponse(room, null);
                    }
                } catch (error) {
                    console.error(`Autoplay fallback error for room ${roomId}:`, error.message);
                }
            }

            // No autoplay or autoplay failed - emit rotation:idle
            room.currentDjIndex = -1;
            room.currentTrack = {
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
            room.isPlaying = false;
            await room.save();

            // Emit rotation:idle event (will be handled by engine)
            return this._formatRoomResponse(room, null);
        }

        room.currentDjIndex = nextDjIndex;
        await this.loadNextTrackForDj(room, nextDjIndex);

        // Log activity
        const nextDj = room.djs[nextDjIndex];
        await RoomActivity.create({
            roomId,
            userId: nextDj.userId,
            userName: nextDj.userName,
            activityType: 'DJ_ROTATED',
        });

        return this._formatRoomResponse(room, null);
    }

    /**
     * Load bài tiếp theo cho DJ (public để engine có thể gọi)
     */
    async loadNextTrackForDj(room, djIndex) {
        const dj = room.djs[djIndex];
        if (!dj || !dj.isActive) {
            return;
        }

        // Lấy bài tiếp theo từ queue của DJ
        if (dj.nextTrackIndex >= dj.trackQueue.length) {
            // DJ hết bài, chuyển sang DJ tiếp theo
            if (room.rotationSettings.autoAdvanceDJ) {
                const nextDjIndex = this._getNextActiveDjIndex(room, djIndex);
                if (nextDjIndex !== -1) {
                    room.currentDjIndex = nextDjIndex;
                    return await this.loadNextTrackForDj(room, nextDjIndex);
                }
            }
            // Không có DJ tiếp theo hoặc không auto advance
            room.currentTrack = {
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
            room.isPlaying = false;
            return;
        }

        const track = dj.trackQueue[dj.nextTrackIndex];
        if (!track) {
            return;
        }

        // Cập nhật currentTrack (JQBX-style với đầy đủ fields)
        const now = Date.now();
        room.currentTrack = {
            zingId: track.zingId,
            title: track.title,
            artist: track.artist,
            artists: track.artist, // Alternative field
            thumbnail: track.thumbnail,
            duration: track.duration,
            startedAt: now,
            position: 0,
            streamingUrl: track.streamingUrl,
            isPlaying: true,
            djUserId: dj.userId,
            queuedBy: dj.userId,
            mode: 'rotation',
        };

        // Legacy fields
        room.currentSongId = track.zingId;
        room.currentPosition = 0;
        room.isPlaying = true;
        room.lastSyncAt = new Date();

        // Tăng nextTrackIndex
        dj.nextTrackIndex += 1;

        // Reset vote skips khi bài mới bắt đầu (JQBX-style: sessionId thay đổi)
        room.voteSkips = [];

        await room.save();

        // Invalidate cache
        const { getRoomStateCache } = require('../roomStateCache');
        getRoomStateCache().invalidate(room.roomId);
    }

    /**
     * Lấy DJ tiếp theo trong rotation
     * @private
     */
    _getNextActiveDjIndex(room, currentIndex) {
        const activeDjs = room.djs.filter((dj, index) => dj.isActive);
        if (activeDjs.length === 0) {
            return -1;
        }

        // Tìm DJ tiếp theo (xoay vòng)
        let nextIndex = currentIndex + 1;
        let attempts = 0;
        const maxAttempts = room.djs.length;

        while (attempts < maxAttempts) {
            if (nextIndex >= room.djs.length) {
                nextIndex = 0; // Xoay vòng về đầu
            }

            if (room.djs[nextIndex] && room.djs[nextIndex].isActive) {
                return nextIndex;
            }

            nextIndex += 1;
            attempts += 1;
        }

        return -1;
    }

    /**
     * Sắp xếp lại thứ tự DJ (chỉ owner)
     * @param {string} roomId - ID phòng
     * @param {string} ownerId - ID owner
     * @param {Array<string>} newOrder - Array of userIds theo thứ tự mới
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async reorderDjs(roomId, ownerId, newOrder) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra quyền owner
        if (String(room.ownerId) !== String(ownerId)) {
            throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới được sắp xếp lại thứ tự DJ');
        }

        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            throw new AppError('VALIDATION_ERROR', 'newOrder phải là array không rỗng');
        }

        // Validate: tất cả userIds trong newOrder phải là DJ active
        const activeDjUserIds = room.djs.filter(dj => dj.isActive).map(dj => String(dj.userId));
        const isValidOrder = newOrder.every(userId => activeDjUserIds.includes(String(userId)));
        if (!isValidOrder) {
            throw new AppError('VALIDATION_ERROR', 'newOrder chứa userId không phải DJ active');
        }

        // Sắp xếp lại djs array theo newOrder
        const reorderedDjs = [];
        const djsMap = new Map(room.djs.map(dj => [String(dj.userId), dj]));

        // Thêm DJs theo thứ tự mới
        for (const userId of newOrder) {
            const dj = djsMap.get(String(userId));
            if (dj && dj.isActive) {
                reorderedDjs.push(dj);
            }
        }

        // Thêm các DJs không có trong newOrder (nếu có)
        for (const dj of room.djs) {
            if (dj.isActive && !newOrder.includes(String(dj.userId))) {
                reorderedDjs.push(dj);
            }
        }

        // Cập nhật djs array
        room.djs = reorderedDjs;

        // Điều chỉnh currentDjIndex
        if (room.currentDjIndex >= 0 && room.currentDjIndex < room.djs.length) {
            const currentDj = room.djs[room.currentDjIndex];
            if (currentDj && currentDj.isActive) {
                // Tìm lại index của current DJ trong array mới
                const newIndex = reorderedDjs.findIndex(dj => String(dj.userId) === String(currentDj.userId));
                if (newIndex >= 0) {
                    room.currentDjIndex = newIndex;
                }
            }
        }

        // Cập nhật djOrder
        room.djOrder = newOrder.map(userId => String(userId));

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId: ownerId,
            userName: room.ownerName,
            activityType: 'DJ_REORDERED',
            metadata: { newOrder },
        });

        return this._formatRoomResponse(room, ownerId);
    }

    /**
     * Sắp xếp lại queue của DJ
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID DJ
     * @param {Array<string>} newOrder - Array of zingIds theo thứ tự mới
     * @returns {Promise<Object>} Room đã cập nhật
     */
    async reorderDjQueue(roomId, userId, newOrder) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra quyền sử dụng permission system
        const { requirePermission, ACTION } = require('../../utils/permissionUtils');
        requirePermission(room, userId, ACTION.REORDER_DJ_QUEUE);

        const userIdString = String(userId);
        const dj = room.djs.find((d) => String(d.userId) === userIdString && d.isActive);

        if (!dj) {
            throw new AppError('NOT_DJ', 'Bạn không phải DJ trong phòng này');
        }

        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            throw new AppError('VALIDATION_ERROR', 'newOrder phải là array không rỗng');
        }

        // Validate: tất cả zingIds trong newOrder phải có trong trackQueue
        const queueZingIds = dj.trackQueue.map(t => t.zingId);
        const isValidOrder = newOrder.every(zingId => queueZingIds.includes(zingId));
        if (!isValidOrder) {
            throw new AppError('VALIDATION_ERROR', 'newOrder chứa zingId không có trong queue');
        }

        // Sắp xếp lại trackQueue theo newOrder
        const reorderedQueue = [];
        const queueMap = new Map(dj.trackQueue.map(track => [track.zingId, track]));

        // Thêm tracks theo thứ tự mới
        for (const zingId of newOrder) {
            const track = queueMap.get(zingId);
            if (track) {
                reorderedQueue.push(track);
            }
        }

        // Cập nhật trackQueue
        dj.trackQueue = reorderedQueue;

        // Điều chỉnh nextTrackIndex
        if (dj.nextTrackIndex >= 0 && dj.nextTrackIndex < dj.trackQueue.length) {
            const currentTrack = dj.trackQueue[dj.nextTrackIndex];
            if (currentTrack) {
                // Tìm lại index của current track trong queue mới
                const newIndex = reorderedQueue.findIndex(t => t.zingId === currentTrack.zingId);
                if (newIndex >= 0) {
                    dj.nextTrackIndex = newIndex;
                } else {
                    // Track hiện tại không còn trong queue, reset về 0
                    dj.nextTrackIndex = 0;
                }
            }
        } else if (dj.nextTrackIndex >= dj.trackQueue.length) {
            dj.nextTrackIndex = Math.max(0, dj.trackQueue.length - 1);
        }

        await room.save();

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName: dj.userName,
            activityType: 'DJ_QUEUE_REORDERED',
            metadata: { queueLength: dj.trackQueue.length },
        });

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Lấy trạng thái phòng DJ rotation
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID người dùng (optional)
     * @returns {Promise<Object>} Room state
     */
    async getRoomState(roomId, userId = null) {
        const room = await Room.findOne({ roomId, isActive: true, mode: 'dj_rotation' }).lean();
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng hoặc phòng không phải DJ rotation mode');
        }

        return this._formatRoomResponse(room, userId);
    }

    /**
     * Format room response cho DJ rotation
     * @private
     */
    _formatRoomResponse(room, userId = null) {
        const roomObj = room.toObject ? room.toObject() : room;
        const userIdString = userId ? String(userId) : null;

        const isOwner = userIdString ? String(roomObj.ownerId) === userIdString : false;
        const isMember = userIdString
            ? roomObj.members?.some((m) => String(m.userId) === userIdString) || false
            : false;

        // Tìm DJ của user
        const userDj = userIdString
            ? roomObj.djs?.find((dj) => String(dj.userId) === userIdString && dj.isActive)
            : null;

        const response = {
            roomId: roomObj.roomId,
            name: roomObj.name,
            description: roomObj.description,
            hostId: roomObj.hostId || roomObj.ownerId,
            ownerId: roomObj.ownerId,
            ownerName: roomObj.ownerName,
            mode: roomObj.mode || 'normal',
            members: roomObj.members || [],
            memberCount: roomObj.memberCount,
            isPrivate: roomObj.isPrivate,
            isPublic: roomObj.isPublic !== undefined ? roomObj.isPublic : !roomObj.isPrivate,
            maxMembers: roomObj.maxMembers,
            settings: roomObj.settings || {},
            currentTrack: roomObj.currentTrack || {
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
                mode: roomObj.mode || 'normal',
            },
            // DJ Rotation specific
            djs: roomObj.djs?.filter((dj) => dj.isActive).map((dj) => ({
                userId: dj.userId,
                userName: dj.userName,
                trackQueue: dj.trackQueue || [],
                nextTrackIndex: dj.nextTrackIndex || 0,
                isActive: dj.isActive,
                joinedAt: dj.joinedAt,
            })) || [],
            currentDjIndex: roomObj.currentDjIndex !== undefined ? roomObj.currentDjIndex : -1,
            rotationSettings: roomObj.rotationSettings || {
                maxDjSlots: 10,
                allowGuestsToJoinDJ: true,
                autoAdvanceDJ: true,
                strictSync: true,
            },
            // Legacy fields
            currentSongId: roomObj.currentSongId || roomObj.currentTrack?.zingId || null,
            currentPosition: roomObj.currentPosition !== undefined ? roomObj.currentPosition : (roomObj.currentTrack?.position || 0),
            isPlaying: roomObj.isPlaying !== undefined ? roomObj.isPlaying : false,
            lastSyncAt: roomObj.lastSyncAt,
            isOwner,
            isMember,
            isDj: !!userDj,
            myDjQueue: userDj ? userDj.trackQueue : [],
            createdAt: roomObj.createdAt,
            updatedAt: roomObj.updatedAt,
        };

        return response;
    }
}

module.exports = new DjRotationService();

