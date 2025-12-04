/**
 * Room Service - Real-time Group Music Listening
 * Clean Code: Tách biệt business logic khỏi controller
 */
const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const RoomInvitation = require('../../models/RoomInvitation');
const Song = require('../../models/Song');
const { generateUniqueRandomId } = require('../../utils/generateId');
const songService = require('./songService');
const userSearchService = require('./userSearchService');
const zingService = require('../zing.service');
const voteSkipService = require('./voteSkipService');
const { getRoomStateCache } = require('../roomStateCache');
const { getSyncData } = require('../../utils/syncUtils');
const AppError = require('../../utils/AppError');

class RoomService {
  /**
   * Tạo phòng mới
   * @param {string} ownerId - ID của chủ phòng
   * @param {string} ownerName - Tên chủ phòng
   * @param {Object} data - Thông tin phòng
   * @returns {Promise<Object>} Thông tin phòng đã tạo
   */
  async createRoom(ownerId, ownerName, data = {}) {
    const { name, description, isPrivate = false, maxMembers = 50, mode = 'normal' } = data;

    // If coop mode, use coopService
    if (mode === 'coop') {
      const coopService = require('./coopService');
      return await coopService.createCoopRoom(ownerId, ownerName, data);
    }

    // Validate
    if (!name || name.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Tên phòng không được để trống');
    }

    if (maxMembers < 2 || maxMembers > 100) {
      throw new AppError('VALIDATION_ERROR', 'Số thành viên tối đa phải từ 2 đến 100');
    }

    const room = await Room.create({
      roomId: await generateUniqueRandomId(Room, 'roomId'),
      name: name.trim(),
      description: description?.trim() || '',
      hostId: String(ownerId), // JQBX-style
      ownerId: String(ownerId), // Legacy
      ownerName,
      members: [{ userId: String(ownerId), userName: ownerName }],
      memberCount: 1,
      isPrivate: Boolean(isPrivate),
      isPublic: !Boolean(isPrivate), // JQBX-style
      maxMembers: parseInt(maxMembers),
      isActive: true,
      pendingRequests: [],
      settings: {
        autoplay: true,
        allowMemberSkip: false,
        allowMemberAddTrack: true,
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
        mode: 'normal',
      },
    });

    // Log activity
    await RoomActivity.create({
      roomId: room.roomId,
      userId: ownerId,
      userName: ownerName,
      activityType: 'ROOM_CREATED',
    });

    return this._formatRoomResponse(room, ownerId);
  }

  /**
   * Tham gia phòng
   * - Phòng công khai: tham gia ngay
   * - Phòng riêng tư: thêm vào pendingRequests, cần chủ phòng chấp nhận
   * @param {string} roomId - ID phòng
   * @param {string} userId - ID người dùng
   * @param {string} userName - Tên người dùng
   * @returns {Promise<Object>} Thông tin phòng
   */
  async joinRoom(roomId, userId, userName) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    const userIdString = String(userId);

    // Kiểm tra đã join chưa
    const existingMember = room.members.find((m) => String(m.userId) === userIdString);
    if (existingMember) {
      return this._formatRoomResponse(room, userId);
    }

    // Kiểm tra số lượng thành viên
    if (room.memberCount >= room.maxMembers) {
      throw new AppError('ROOM_FULL', 'Phòng đã đầy');
    }

    // Xử lý theo loại phòng
    if (room.isPrivate) {
      // Phòng riêng tư: thêm vào pendingRequests
      const existingRequest = room.pendingRequests.find(
        (r) => String(r.userId) === userIdString
      );
      if (existingRequest) {
        throw new AppError('ALREADY_REQUESTED', 'Bạn đã gửi yêu cầu tham gia phòng này');
      }

      room.pendingRequests.push({
        userId: userIdString,
        userName,
        requestedAt: new Date(),
      });
      await room.save();

      // Log activity
      await RoomActivity.create({
        roomId,
        userId,
        userName,
        activityType: 'JOIN_REQUEST',
      });

      throw new AppError('PENDING_APPROVAL', 'Yêu cầu tham gia đã được gửi, chờ chủ phòng duyệt');
    } else {
      // Phòng công khai: tham gia ngay
      room.members.push({ userId: userIdString, userName });
      room.memberCount += 1;
      await room.save();

      // Log activity
      await RoomActivity.create({
        roomId,
        userId,
        userName,
        activityType: 'USER_JOINED',
      });

      return this._formatRoomResponse(room, userId);
    }
  }

  /**
   * Chấp nhận yêu cầu tham gia phòng (chỉ chủ phòng)
   * @param {string} roomId - ID phòng
   * @param {string} ownerId - ID chủ phòng
   * @param {string} requestUserId - ID người dùng yêu cầu
   * @returns {Promise<Object>} Thông tin phòng
   */
  async acceptJoinRequest(roomId, ownerId, requestUserId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền chủ phòng
    if (String(room.ownerId) !== String(ownerId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới có quyền chấp nhận yêu cầu');
    }

    const requestUserIdString = String(requestUserId);

    // Tìm yêu cầu
    const requestIndex = room.pendingRequests.findIndex(
      (r) => String(r.userId) === requestUserIdString
    );
    if (requestIndex === -1) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu tham gia');
    }

    // Kiểm tra số lượng thành viên
    if (room.memberCount >= room.maxMembers) {
      throw new AppError('ROOM_FULL', 'Phòng đã đầy');
    }

    // Kiểm tra đã là member chưa
    const existingMember = room.members.find((m) => String(m.userId) === requestUserIdString);
    if (existingMember) {
      // Xóa request nếu đã là member
      room.pendingRequests.splice(requestIndex, 1);
      await room.save();
      return this._formatRoomResponse(room, ownerId);
    }

    // Thêm vào members
    const request = room.pendingRequests[requestIndex];
    room.members.push({
      userId: requestUserIdString,
      userName: request.userName,
    });
    room.memberCount += 1;

    // Xóa khỏi pendingRequests
    room.pendingRequests.splice(requestIndex, 1);
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: requestUserId,
      userName: request.userName,
      activityType: 'JOIN_REQUEST_ACCEPTED',
    });

    return this._formatRoomResponse(room, ownerId);
  }

  /**
   * Từ chối yêu cầu tham gia phòng (chỉ chủ phòng)
   * @param {string} roomId - ID phòng
   * @param {string} ownerId - ID chủ phòng
   * @param {string} requestUserId - ID người dùng yêu cầu
   * @returns {Promise<Object>} Thông tin phòng
   */
  async rejectJoinRequest(roomId, ownerId, requestUserId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền chủ phòng
    if (String(room.ownerId) !== String(ownerId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới có quyền từ chối yêu cầu');
    }

    const requestUserIdString = String(requestUserId);

    // Tìm và xóa yêu cầu
    const requestIndex = room.pendingRequests.findIndex(
      (r) => String(r.userId) === requestUserIdString
    );
    if (requestIndex === -1) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu tham gia');
    }

    const request = room.pendingRequests[requestIndex];
    room.pendingRequests.splice(requestIndex, 1);
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: requestUserId,
      userName: request.userName,
      activityType: 'JOIN_REQUEST_REJECTED',
    });

    return this._formatRoomResponse(room, ownerId);
  }

  /**
   * Gửi lời mời vào phòng (chỉ chủ phòng)
   * @param {string} roomId - ID phòng
   * @param {string} ownerId - ID chủ phòng
   * @param {string} inviteeId - ID người được mời
   * @param {string} message - Lời nhắn (optional)
   * @returns {Promise<Object>} Thông tin invitation
   */
  async inviteUser(roomId, ownerId, inviteeId, message = null) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền chủ phòng
    if (String(room.ownerId) !== String(ownerId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới có quyền mời người dùng');
    }

    // Kiểm tra user được mời có tồn tại không
    const invitee = await userSearchService.getUserById(inviteeId);
    if (!invitee) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng');
    }

    // Kiểm tra đã là member chưa
    const existingMember = room.members.find((m) => String(m.userId) === String(inviteeId));
    if (existingMember) {
      throw new AppError('ALREADY_MEMBER', 'Người dùng đã là thành viên của phòng');
    }

    // Kiểm tra đã có invitation chưa
    const existingInvitation = await RoomInvitation.findOne({
      roomId,
      inviteeId: String(inviteeId),
      status: 'PENDING',
    });

    if (existingInvitation) {
      throw new AppError('ALREADY_INVITED', 'Đã gửi lời mời cho người dùng này');
    }

    // Tạo invitation
    const invitation = await RoomInvitation.create({
      roomId,
      roomName: room.name,
      inviterId: String(ownerId),
      inviterName: room.ownerName,
      inviteeId: String(inviteeId),
      inviteeName: invitee.fullname || invitee.username,
      message: message?.trim() || null,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    });

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: ownerId,
      userName: room.ownerName,
      activityType: 'USER_INVITED',
      metadata: { inviteeId, inviteeName: invitee.fullname || invitee.username },
    });

    return {
      invitationId: invitation._id,
      roomId: invitation.roomId,
      roomName: invitation.roomName,
      inviterName: invitation.inviterName,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Rời phòng
   * @param {string} roomId - ID phòng
   * @param {string} userId - ID người dùng
   * @returns {Promise<Object>} Thông tin phòng
   */
  async leaveRoom(roomId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    const userIdString = String(userId);

    // Không cho phép chủ phòng rời phòng
    if (String(room.ownerId) === userIdString) {
      throw new AppError('FORBIDDEN', 'Chủ phòng không thể rời phòng. Hãy xóa phòng nếu muốn kết thúc.');
    }

    // Xóa member
    const memberIndex = room.members.findIndex((m) => String(m.userId) === userIdString);
    if (memberIndex === -1) {
      throw new AppError('NOT_MEMBER', 'Bạn không phải thành viên của phòng này');
    }

    const member = room.members[memberIndex];
    room.members.splice(memberIndex, 1);
    room.memberCount = Math.max(0, room.memberCount - 1);
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId,
      userName: member.userName || 'Unknown',
      activityType: 'USER_LEFT',
    });

    // Reload room để lấy thông tin mới nhất
    const updatedRoom = await Room.findOne({ roomId, isActive: true });
    return this._formatRoomResponse(updatedRoom, userId);
  }

  /**
   * Cập nhật trạng thái phát nhạc
   * @param {string} roomId - ID phòng
   * @param {Object} data - Dữ liệu playback
   * @returns {Promise<Object>} Thông tin phòng
   */
  /**
   * Cập nhật trạng thái phát nhạc
   * CHỈ CHỦ PHÒNG mới được phép cập nhật playback state
   * @param {string} roomId - ID phòng
   * @param {Object} data - Dữ liệu playback
   * @param {string} userId - ID người dùng (phải là owner)
   * @returns {Promise<Object>} Thông tin phòng
   */
  async updatePlaybackState(roomId, data, userId) {
    const { currentSongId, currentPosition, isPlaying } = data;

    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền: CHỈ CHỦ PHÒNG mới được update playback
    if (String(room.ownerId) !== String(userId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới được điều khiển phát nhạc');
    }

    room.currentSongId = currentSongId || null;
    room.currentPosition = currentPosition || 0;
    room.isPlaying = isPlaying || false;
    room.lastSyncAt = new Date();
    await room.save();

    // Log activity
    if (currentSongId) {
      await RoomActivity.create({
        roomId,
        userId: room.ownerId,
        userName: room.ownerName,
        activityType: isPlaying ? 'SONG_STARTED' : 'PLAYBACK_PAUSED',
        metadata: { songId: currentSongId, position: currentPosition },
      });
    }

    return this._formatRoomResponse(room, userId);
  }

  /**
   * Thêm bài hát vào queue
   * @param {string} roomId - ID phòng
   * @param {string} songId - ID bài hát
   * @param {string} addedBy - ID người thêm
   * @returns {Promise<Object>} Thông tin phòng
   */
  async addSongToQueue(roomId, songId, addedBy) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra user đã join room chưa
    const isMember = room.members.some((m) => String(m.userId) === String(addedBy));
    if (!isMember) {
      throw new AppError('FORBIDDEN', 'Bạn phải tham gia phòng trước khi thêm bài hát');
    }

    // Kiểm tra bài hát đã có trong queue chưa
    const existing = room.queue.find((q) => q.songId === songId);
    if (existing) {
      throw new AppError('ALREADY_IN_QUEUE', 'Bài hát đã có trong danh sách phát');
    }

    // Đảm bảo bài hát tồn tại trong DB (lấy từ ZingMp3 và lưu)
    // saveSongToDB sẽ tự động fetch từ ZingMp3 nếu chưa có trong DB
    await songService.saveSongToDB(songId);

    // Thêm vào queue
    const maxOrder = room.queue.length > 0 ? Math.max(...room.queue.map((q) => q.order || 0)) : 0;
    room.queue.push({
      songId,
      addedBy: String(addedBy),
      order: maxOrder + 1,
      addedAt: new Date(),
    });

    // Nếu chưa có bài hát nào đang phát, tự động phát bài đầu tiên
    const shouldAutoPlay = !room.currentSongId && room.queue.length > 0;
    if (shouldAutoPlay) {
      const firstSong = room.queue[0];
      room.currentSongId = firstSong.songId;
      room.currentPosition = 0;
      room.isPlaying = true;
      room.lastSyncAt = new Date();
    }

    await room.save();

    // Log activity
    const user = room.members.find((m) => String(m.userId) === String(addedBy));
    await RoomActivity.create({
      roomId,
      userId: addedBy,
      userName: user?.userName || 'Unknown',
      activityType: 'SONG_ADDED',
      metadata: { songId },
    });

    // Reload room để lấy queue với đầy đủ thông tin bài hát
    const updatedRoom = await this.getRoomWithSongs(roomId, addedBy);

    // Format response với queueWithUrls đã được populate
    const formattedRoom = this._formatRoomResponse(updatedRoom, addedBy);
    // Đảm bảo queueWithUrls được giữ lại (vì _formatRoomResponse không include queueWithUrls)
    formattedRoom.queueWithUrls = updatedRoom.queueWithUrls;

    return formattedRoom;
  }

  /**
   * Chủ phòng chọn bài hát từ queue để phát
   * @param {string} roomId - ID phòng
   * @param {string} songId - ID bài hát
   * @param {string} userId - ID người dùng (phải là owner)
   * @returns {Promise<Object>} Thông tin phòng
   */
  async playSongFromQueue(roomId, songId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền: CHỈ CHỦ PHÒNG mới được chọn bài để phát
    if (String(room.ownerId) !== String(userId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới được chọn bài để phát');
    }

    // Kiểm tra bài hát có trong queue không
    const queueItem = room.queue.find((q) => q.songId === songId);
    if (!queueItem) {
      throw new AppError('NOT_FOUND', 'Bài hát không có trong danh sách phát');
    }

    // Đảm bảo bài hát đã có trong DB
    await songService.saveSongToDB(songId);

    // Cập nhật current song và bắt đầu phát
    room.currentSongId = songId;
    room.currentPosition = 0;
    room.isPlaying = true;
    room.lastSyncAt = new Date();
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: room.ownerId,
      userName: room.ownerName,
      activityType: 'SONG_STARTED',
      metadata: { songId },
    });

    // Reload room để lấy đầy đủ thông tin
    const updatedRoom = await this.getRoomWithSongs(roomId, userId);
    const formattedRoom = this._formatRoomResponse(updatedRoom, userId);
    if (updatedRoom.queueWithUrls) {
      formattedRoom.queueWithUrls = updatedRoom.queueWithUrls;
    }
    if (updatedRoom.currentSongStreamingUrl) {
      formattedRoom.currentSongStreamingUrl = updatedRoom.currentSongStreamingUrl;
    }

    return formattedRoom;
  }

  /**
   * Tự động phát bài hát tiếp theo trong queue (CHỈ CHỦ PHÒNG)
   * Được gọi khi bài hát hiện tại kết thúc hoặc chủ phòng nhấn next
   * @param {string} roomId - ID phòng
   * @param {string} userId - ID người dùng (phải là owner)
   * @returns {Promise<Object|null>} Thông tin phòng hoặc null nếu không còn bài hát
   */
  async playNextSong(roomId, userId = null) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return null;
    }

    // Nếu có userId, kiểm tra quyền (chỉ owner mới được next)
    if (userId && String(room.ownerId) !== String(userId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới được chuyển bài hát');
    }

    // Tìm bài hát tiếp theo trong queue
    if (!room.currentSongId || room.queue.length === 0) {
      // Nếu không có bài hát hiện tại, phát bài đầu tiên
      if (room.queue.length > 0) {
        const firstSong = room.queue[0];
        room.currentSongId = firstSong.songId;
        room.currentPosition = 0;
        room.isPlaying = true;
        room.lastSyncAt = new Date();
        await room.save();

        // Log activity
        await RoomActivity.create({
          roomId,
          userId: room.ownerId,
          userName: room.ownerName,
          activityType: 'SONG_STARTED',
          metadata: { songId: firstSong.songId },
        });

        const updatedRoom = await this.getRoomWithSongs(roomId, room.ownerId);
        const formattedRoom = this._formatRoomResponse(updatedRoom, room.ownerId);
        if (updatedRoom.queueWithUrls) {
          formattedRoom.queueWithUrls = updatedRoom.queueWithUrls;
        }
        if (updatedRoom.currentSongStreamingUrl) {
          formattedRoom.currentSongStreamingUrl = updatedRoom.currentSongStreamingUrl;
        }
        return formattedRoom;
      }
      return null;
    }

    // Tìm vị trí bài hát hiện tại trong queue
    const currentIndex = room.queue.findIndex((q) => q.songId === room.currentSongId);
    if (currentIndex === -1 || currentIndex === room.queue.length - 1) {
      // Không tìm thấy hoặc đã là bài cuối cùng
      room.currentSongId = null;
      room.currentPosition = 0;
      room.isPlaying = false;
      room.lastSyncAt = new Date();
      await room.save();
      return null;
    }

    // Phát bài hát tiếp theo
    const nextSong = room.queue[currentIndex + 1];
    room.currentSongId = nextSong.songId;
    room.currentPosition = 0;
    room.isPlaying = true;
    room.lastSyncAt = new Date();
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: room.ownerId,
      userName: room.ownerName,
      activityType: 'SONG_STARTED',
      metadata: { songId: nextSong.songId },
    });

    const updatedRoom = await this.getRoomWithSongs(roomId, room.ownerId);
    const formattedRoom = this._formatRoomResponse(updatedRoom, room.ownerId);
    if (updatedRoom.queueWithUrls) {
      formattedRoom.queueWithUrls = updatedRoom.queueWithUrls;
    }
    if (updatedRoom.currentSongStreamingUrl) {
      formattedRoom.currentSongStreamingUrl = updatedRoom.currentSongStreamingUrl;
    }
    return formattedRoom;
  }

  /**
   * Xóa bài hát khỏi queue
   * @param {string} roomId - ID phòng
   * @param {string} songId - ID bài hát
   * @param {string} userId - ID người xóa
   * @returns {Promise<Object>} Thông tin phòng
   */
  async removeSongFromQueue(roomId, songId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Tìm bài hát trong queue
    const queueItem = room.queue.find((q) => q.songId === songId);
    if (!queueItem) {
      throw new AppError('NOT_FOUND', 'Bài hát không có trong danh sách phát');
    }

    // Chỉ owner hoặc người thêm bài mới được xóa
    const userIdString = String(userId);
    const isOwner = String(room.ownerId) === userIdString;
    const isAddedBy = String(queueItem.addedBy) === userIdString;

    if (!isOwner && !isAddedBy) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền xóa bài hát này');
    }

    // Xóa khỏi queue
    room.queue = room.queue.filter((q) => q.songId !== songId);
    await room.save();

    // Log activity
    const user = room.members.find((m) => String(m.userId) === userIdString);
    await RoomActivity.create({
      roomId,
      userId,
      userName: user?.userName || 'Unknown',
      activityType: 'SONG_REMOVED',
      metadata: { songId },
    });

    return this._formatRoomResponse(room, userId);
  }

  /**
   * Lấy thông tin phòng với streaming URLs
   * @param {string} roomId - ID phòng
   * @param {string} userId - ID người dùng (optional)
   * @returns {Promise<Object>} Thông tin phòng đầy đủ
   */
  async getRoomWithSongs(roomId, userId = null) {
    const room = await Room.findOne({ roomId, isActive: true }).lean();
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    const roomData = { ...room };

    // Kiểm tra quyền
    if (userId) {
      const userIdString = String(userId);
      roomData.isOwner = String(room.ownerId) === userIdString;
      roomData.isMember = room.members.some((m) => String(m.userId) === userIdString) || roomData.isOwner;
    } else {
      roomData.isOwner = false;
      roomData.isMember = false;
    }

    // Lấy streaming URL cho current song
    if (room.currentSongId) {
      try {
        roomData.currentSongStreamingUrl = await songService.getStreamingUrl(room.currentSongId, true);
      } catch (error) {
        roomData.currentSongStreamingUrl = null;
      }
    }

    // Populate thông tin bài hát cho queue từ DB
    if (room.queue && room.queue.length > 0) {
      roomData.queueWithUrls = await Promise.all(
        room.queue.map(async (item) => {
          try {
            // Lấy thông tin bài hát từ DB
            const song = await Song.findOne({ songId: item.songId }).lean();

            // Nếu không có trong DB, lấy từ ZingMp3 và lưu vào DB
            if (!song) {
              await songService.saveSongToDB(item.songId);
              const savedSong = await Song.findOne({ songId: item.songId }).lean();
              if (savedSong) {
                // Lấy streaming URL
                let streamingUrl = null;
                try {
                  streamingUrl = await songService.getStreamingUrl(item.songId, true);
                } catch (error) {
                  // Ignore streaming URL error
                }

                return {
                  ...item,
                  title: savedSong.title,
                  artistsNames: savedSong.artistsNames,
                  thumbnail: savedSong.thumbnail,
                  duration: savedSong.duration,
                  artistIds: savedSong.artistIds,
                  albumId: savedSong.albumId,
                  streamingUrl,
                };
              }
            }

            // Lấy streaming URL
            let streamingUrl = null;
            try {
              streamingUrl = await songService.getStreamingUrl(item.songId, true);
            } catch (error) {
              // Ignore streaming URL error
            }

            // Trả về queue item với đầy đủ thông tin bài hát
            return {
              ...item,
              title: song?.title || null,
              artistsNames: song?.artistsNames || null,
              thumbnail: song?.thumbnail || null,
              duration: song?.duration || null,
              artistIds: song?.artistIds || null,
              albumId: song?.albumId || null,
              streamingUrl,
            };
          } catch (error) {
            // Nếu có lỗi, vẫn trả về item cơ bản
            console.error(`Error populating song info for ${item.songId}:`, error.message);
            return { ...item, streamingUrl: null };
          }
        })
      );
    }

    return roomData;
  }

  /**
   * Lấy danh sách phòng công khai
   * @param {number} limit - Số lượng tối đa
   * @returns {Promise<Array>} Danh sách phòng
   */
  async getPublicRooms(limit = 20) {
    return Room.find({ isPrivate: false, isActive: true })
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(limit)
      .select('roomId name description ownerName memberCount currentSongId isPlaying createdAt')
      .lean();
  }

  /**
   * Lấy phòng của user
   * @param {string} userId - ID người dùng
   * @returns {Promise<Array>} Danh sách phòng
   */
  async getUserRooms(userId) {
    return Room.find({
      $or: [{ ownerId: String(userId) }, { 'members.userId': String(userId) }],
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .select('roomId name description ownerName memberCount currentSongId isPlaying isPrivate createdAt')
      .lean();
  }

  /**
   * Lấy danh sách yêu cầu tham gia phòng (chỉ chủ phòng)
   * @param {string} roomId - ID phòng
   * @param {string} ownerId - ID chủ phòng
   * @returns {Promise<Array>} Danh sách yêu cầu
   */
  async getPendingRequests(roomId, ownerId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền chủ phòng
    if (String(room.ownerId) !== String(ownerId)) {
      throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới có quyền xem yêu cầu tham gia');
    }

    return room.pendingRequests || [];
  }

  /**
   * Lấy danh sách lời mời của user
   * @param {string} userId - ID người dùng
   * @returns {Promise<Array>} Danh sách lời mời
   */
  async getUserInvitations(userId) {
    const invitations = await RoomInvitation.find({
      inviteeId: String(userId),
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    return invitations.map((inv) => ({
      invitationId: inv._id,
      roomId: inv.roomId,
      roomName: inv.roomName,
      inviterId: inv.inviterId,
      inviterName: inv.inviterName,
      message: inv.message,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }

  /**
   * Chấp nhận lời mời vào phòng
   * @param {string} invitationId - ID lời mời
   * @param {string} userId - ID người dùng
   * @returns {Promise<Object>} Thông tin phòng
   */
  async acceptInvitation(invitationId, userId) {
    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy lời mời');
    }

    // Kiểm tra quyền
    if (String(invitation.inviteeId) !== String(userId)) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền chấp nhận lời mời này');
    }

    // Kiểm tra trạng thái
    if (invitation.status !== 'PENDING') {
      throw new AppError('INVALID_STATUS', 'Lời mời đã được xử lý');
    }

    // Kiểm tra hết hạn
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new AppError('INVITATION_EXPIRED', 'Lời mời đã hết hạn');
    }

    // Tham gia phòng (bỏ qua pending request vì đã được mời)
    const room = await Room.findOne({ roomId: invitation.roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Phòng không tồn tại');
    }

    const userIdString = String(userId);

    // Kiểm tra đã là member chưa
    const existingMember = room.members.find((m) => String(m.userId) === userIdString);
    if (!existingMember) {
      // Kiểm tra số lượng thành viên
      if (room.memberCount >= room.maxMembers) {
        throw new AppError('ROOM_FULL', 'Phòng đã đầy');
      }

      // Thêm vào members
      room.members.push({
        userId: userIdString,
        userName: invitation.inviteeName,
      });
      room.memberCount += 1;

      // Xóa khỏi pendingRequests nếu có
      room.pendingRequests = room.pendingRequests.filter(
        (r) => String(r.userId) !== userIdString
      );

      await room.save();

      // Log activity
      await RoomActivity.create({
        roomId: room.roomId,
        userId,
        userName: invitation.inviteeName,
        activityType: 'USER_JOINED',
      });
    }

    // Cập nhật invitation
    invitation.status = 'ACCEPTED';
    invitation.respondedAt = new Date();
    await invitation.save();

    return this._formatRoomResponse(room, userId);
  }

  /**
   * Từ chối lời mời vào phòng
   * @param {string} invitationId - ID lời mời
   * @param {string} userId - ID người dùng
   * @returns {Promise<Object>} Thông tin invitation
   */
  async rejectInvitation(invitationId, userId) {
    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy lời mời');
    }

    // Kiểm tra quyền
    if (String(invitation.inviteeId) !== String(userId)) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền từ chối lời mời này');
    }

    // Kiểm tra trạng thái
    if (invitation.status !== 'PENDING') {
      throw new AppError('INVALID_STATUS', 'Lời mời đã được xử lý');
    }

    // Cập nhật invitation
    invitation.status = 'REJECTED';
    invitation.respondedAt = new Date();
    await invitation.save();

    return {
      invitationId: invitation._id,
      status: invitation.status,
    };
  }

  // ===== JQBX-STYLE METHODS =====

  /**
   * JQBX: Host play - Bắt đầu phát nhạc
   * @param {string} roomId - ID phòng
   * @param {string} hostId - ID host
   * @returns {Promise<Object>} Room với currentTrack đã cập nhật
   */
  async hostPlay(roomId, hostId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
    requirePermission(room, hostId, ACTION.PLAY);

    // Nếu chưa có currentTrack, lấy từ queue
    if (!room.currentTrack?.zingId && room.queue.length > 0) {
      const firstTrack = room.queue[0];
      await this.hostChangeTrack(roomId, hostId, firstTrack.zingId || firstTrack.songId);
      return await Room.findOne({ roomId, isActive: true });
    }

    if (!room.currentTrack?.zingId) {
      throw new AppError('NO_TRACK', 'Không có bài hát để phát');
    }

    // Cập nhật startedAt = now nếu chưa có hoặc đang pause (JQBX-style)
    const now = Date.now();
    if (!room.currentTrack.startedAt || !room.isPlaying) {
      room.currentTrack.startedAt = now;
      room.currentTrack.position = 0;
    }

    room.isPlaying = true;
    room.currentTrack.isPlaying = true; // Update currentTrack.isPlaying
    room.lastSyncAt = new Date();
    await room.save();

    return this._formatRoomResponse(room, hostId);
  }

  /**
   * JQBX: Host pause - Tạm dừng phát nhạc
   * @param {string} roomId - ID phòng
   * @param {string} hostId - ID host
   * @returns {Promise<Object>} Room
   */
  async hostPause(roomId, hostId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
    requirePermission(room, hostId, ACTION.PAUSE);

    // Freeze position: tính position hiện tại dựa trên startedAt (JQBX-style)
    if (room.currentTrack?.startedAt && room.isPlaying) {
      const now = Date.now();
      const elapsed = (now - room.currentTrack.startedAt) / 1000; // decimal precision
      room.currentTrack.position = Math.min(
        Math.max(0, elapsed),
        room.currentTrack.duration || 0
      );
    }

    room.isPlaying = false;
    if (room.currentTrack) {
      room.currentTrack.isPlaying = false; // Update currentTrack.isPlaying
    }
    room.lastSyncAt = new Date();
    await room.save();

    return this._formatRoomResponse(room, hostId);
  }

  /**
   * JQBX: Host seek - Nhảy đến vị trí cụ thể
   * @param {string} roomId - ID phòng
   * @param {string} hostId - ID host
   * @param {number} position - Vị trí mới (seconds)
   * @returns {Promise<Object>} Room
   */
  async hostSeek(roomId, hostId, position) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
    requirePermission(room, hostId, ACTION.SEEK);

    if (!room.currentTrack?.zingId) {
      throw new AppError('NO_TRACK', 'Không có bài hát đang phát');
    }

    const maxPosition = room.currentTrack.duration || 0;
    const newPosition = Math.max(0, Math.min(position, maxPosition));

    // Cập nhật position và reset startedAt (JQBX-style: seek reset startedAt)
    const now = Date.now();
    room.currentTrack.position = newPosition;
    room.currentTrack.startedAt = now; // Reset startedAt khi seek
    if (room.currentTrack) {
      room.currentTrack.isPlaying = room.isPlaying; // Sync isPlaying
    }
    room.currentPosition = newPosition; // Legacy
    room.lastSyncAt = new Date();
    await room.save();

    return this._formatRoomResponse(room, hostId);
  }

  /**
   * JQBX: Host skip - Chuyển bài tiếp theo
   * @param {string} roomId - ID phòng
   * @param {string} hostId - ID host
   * @returns {Promise<Object>} Room với bài mới
   */
  async hostSkip(roomId, hostId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
    requirePermission(room, hostId, ACTION.SKIP);

    // Tìm bài tiếp theo trong queue
    const currentZingId = room.currentTrack?.zingId || room.currentSongId;
    let nextTrack = null;

    if (currentZingId && room.queue.length > 0) {
      const currentIndex = room.queue.findIndex(
        (q) => (q.zingId || q.songId) === currentZingId
      );
      if (currentIndex >= 0 && currentIndex < room.queue.length - 1) {
        nextTrack = room.queue[currentIndex + 1];
      } else if (room.settings?.autoplay) {
        // Autoplay: lấy bài random liên quan từ ZingMP3 (JQBX-style)
        try {
          const randomSong = await zingService.getRandomRelatedSong(currentZingId);
          if (randomSong && randomSong.zingId) {
            nextTrack = {
              zingId: randomSong.zingId,
              title: randomSong.title,
              artist: randomSong.artist,
              thumbnail: randomSong.thumbnail,
              duration: randomSong.duration,
              addedBy: hostId,
            };
            // Optional: Thêm vào queue để track lịch sử
            // (JQBX không thêm vào queue, chỉ play trực tiếp)
          }
        } catch (error) {
          console.error('Failed to get random related song:', error);
        }
      }
    } else if (room.queue.length > 0) {
      // Chưa có bài nào đang phát, lấy bài đầu tiên
      nextTrack = room.queue[0];
    }

    if (!nextTrack) {
      throw new AppError('NO_NEXT_TRACK', 'Không còn bài hát nào trong queue');
    }

    // Chuyển sang bài mới
    return await this.hostChangeTrack(roomId, hostId, nextTrack.zingId || nextTrack.songId);
  }

  /**
   * JQBX: Host change track - Đổi bài hát
   * @param {string} roomId - ID phòng
   * @param {string} hostId - ID host
   * @param {string} zingId - ZingMP3 song ID
   * @returns {Promise<Object>} Room với bài mới
   */
  async hostChangeTrack(roomId, hostId, zingId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
    requirePermission(room, hostId, ACTION.CHANGE_TRACK);

    // Lấy thông tin bài hát từ ZingMP3
    let songData;
    try {
      songData = await zingService.getFullSongData(zingId);
    } catch (error) {
      throw new AppError('SONG_NOT_FOUND', `Không tìm thấy bài hát: ${error.message}`);
    }

    // Cập nhật currentTrack (JQBX-style với đầy đủ fields)
    const now = Date.now();
    room.currentTrack = {
      zingId: zingId,
      title: songData.title,
      artist: songData.artist,
      artists: songData.artist, // Alternative field
      thumbnail: songData.thumbnail,
      duration: songData.duration,
      startedAt: now,
      position: 0,
      streamingUrl: songData.streamingUrl,
      isPlaying: true,
      djUserId: null, // Normal mode
      queuedBy: hostId,
      mode: 'normal',
    };

    // Legacy fields (backward compatibility)
    room.currentSongId = zingId;
    room.currentPosition = 0;
    room.isPlaying = true;
    room.lastSyncAt = new Date();

    // Reset vote skips khi bài mới bắt đầu
    room.voteSkips = [];

    await room.save();

    // Invalidate cache
    const { getRoomStateCache } = require('../roomStateCache');
    getRoomStateCache().invalidate(roomId);

    // Log activity
    await RoomActivity.create({
      roomId,
      userId: hostId,
      userName: room.ownerName,
      activityType: 'SONG_STARTED',
      metadata: { zingId },
    });

    return this._formatRoomResponse(room, hostId);
  }

  /**
   * JQBX: Get sync data - Lấy dữ liệu sync cho members
   * @param {string} roomId - ID phòng
   * @returns {Promise<Object>} Sync data
   */
  async getSyncData(roomId) {
    const room = await Room.findOne({ roomId, isActive: true }).lean();
    if (!room) {
      return null;
    }

    // Use centralized sync data utility
    return getSyncData(room);
  }

  /**
   * JQBX: Add track to queue
   * @param {string} roomId - ID phòng
   * @param {string} zingId - ZingMP3 song ID
   * @param {string} addedBy - ID người thêm
   * @returns {Promise<Object>} Room
   */
  async addTrackToQueue(roomId, zingId, addedBy) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    // Kiểm tra quyền sử dụng permission system
    const { requirePermission, ACTION } = require('../../utils/permissionUtils');
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
      songId: zingId, // Legacy
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
      metadata: { zingId },
    });

    return this._formatRoomResponse(room, addedBy);
  }

  /**
   * JQBX: Remove track from queue
   * @param {string} roomId - ID phòng
   * @param {string} zingId - ZingMP3 song ID
   * @param {string} userId - ID người xóa
   * @returns {Promise<Object>} Room
   */
  async removeTrackFromQueue(roomId, zingId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
    }

    const queueItem = room.queue.find((q) => (q.zingId || q.songId) === zingId);
    if (!queueItem) {
      throw new AppError('NOT_FOUND', 'Bài hát không có trong danh sách phát');
    }

    // Chỉ owner hoặc người thêm bài mới được xóa
    const userIdString = String(userId);
    const isHost = String(room.hostId || room.ownerId) === userIdString;
    const isAddedBy = String(queueItem.addedBy) === userIdString;

    if (!isHost && !isAddedBy) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền xóa bài hát này');
    }

    room.queue = room.queue.filter((q) => (q.zingId || q.songId) !== zingId);
    await room.save();

    // Log activity
    const user = room.members.find((m) => String(m.userId) === userIdString);
    await RoomActivity.create({
      roomId,
      userId,
      userName: user?.userName || 'Unknown',
      activityType: 'SONG_REMOVED',
      metadata: { zingId },
    });

    return this._formatRoomResponse(room, userId);
  }

  /**
   * Format room response - chuẩn hóa dữ liệu trả về
   * @private
   */
  _formatRoomResponse(room, userId = null) {
    const roomObj = room.toObject ? room.toObject() : room;
    const userIdString = userId ? String(userId) : null;

    // Tính toán isOwner và isMember
    const isOwner = userIdString ? String(roomObj.ownerId) === userIdString : false;
    const isMember = userIdString
      ? roomObj.members?.some((m) => String(m.userId) === userIdString) || false
      : false;

    const response = {
      roomId: roomObj.roomId,
      name: roomObj.name,
      description: roomObj.description,
      hostId: roomObj.hostId || roomObj.ownerId, // JQBX-style
      ownerId: roomObj.ownerId, // Legacy
      ownerName: roomObj.ownerName,
      members: roomObj.members || [],
      memberCount: roomObj.memberCount,
      isPrivate: roomObj.isPrivate,
      isPublic: roomObj.isPublic !== undefined ? roomObj.isPublic : !roomObj.isPrivate, // JQBX-style
      maxMembers: roomObj.maxMembers,
      settings: roomObj.settings || {
        autoplay: true,
        allowMemberSkip: false,
        allowMemberAddTrack: true,
        strictSync: true,
      },
      currentTrack: roomObj.currentTrack ? {
        zingId: roomObj.currentTrack.zingId || roomObj.currentSongId || null,
        title: roomObj.currentTrack.title || null,
        artist: roomObj.currentTrack.artist || null,
        artists: roomObj.currentTrack.artists || roomObj.currentTrack.artist || null,
        thumbnail: roomObj.currentTrack.thumbnail || null,
        duration: roomObj.currentTrack.duration || 0,
        startedAt: roomObj.currentTrack.startedAt || 0,
        position: roomObj.currentTrack.position || roomObj.currentPosition || 0,
        streamingUrl: roomObj.currentTrack.streamingUrl || null,
        isPlaying: roomObj.currentTrack.isPlaying !== undefined ? roomObj.currentTrack.isPlaying : (roomObj.isPlaying || false),
        djUserId: roomObj.currentTrack.djUserId || null,
        queuedBy: roomObj.currentTrack.queuedBy || null,
        mode: roomObj.currentTrack.mode || (roomObj.mode === 'dj_rotation' ? 'rotation' : 'normal'),
      } : {
        zingId: roomObj.currentSongId || null,
        title: null,
        artist: null,
        artists: null,
        thumbnail: null,
        duration: 0,
        startedAt: 0,
        position: roomObj.currentPosition || 0,
        streamingUrl: null,
        isPlaying: false,
        djUserId: null,
        queuedBy: null,
        mode: roomObj.mode === 'dj_rotation' ? 'rotation' : 'normal',
      },
      // Legacy fields (backward compatibility)
      currentSongId: roomObj.currentSongId || roomObj.currentTrack?.zingId || null,
      currentPosition: roomObj.currentPosition !== undefined ? roomObj.currentPosition : (roomObj.currentTrack?.position || 0),
      isPlaying: roomObj.isPlaying !== undefined ? roomObj.isPlaying : false,
      lastSyncAt: roomObj.lastSyncAt,
      queue: roomObj.queue || [],
      pendingRequests: roomObj.pendingRequests || [],
      isOwner,
      isMember,
      createdAt: roomObj.createdAt,
      updatedAt: roomObj.updatedAt,
    };

    // Giữ lại queueWithUrls và currentSongStreamingUrl nếu có (từ getRoomWithSongs)
    if (roomObj.queueWithUrls) {
      response.queueWithUrls = roomObj.queueWithUrls;
    }
    if (roomObj.currentSongStreamingUrl) {
      response.currentSongStreamingUrl = roomObj.currentSongStreamingUrl;
    }

    return response;
  }
}

module.exports = new RoomService();
