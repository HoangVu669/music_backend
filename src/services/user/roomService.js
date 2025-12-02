/**
 * Room Service - Real-time Group Music Listening
 * Clean Code: Tách biệt business logic khỏi controller
 */
const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const RoomInvitation = require('../../models/RoomInvitation');
const { generateUniqueRandomId } = require('../../utils/generateId');
const songService = require('./songService');
const userSearchService = require('./userSearchService');
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
    const { name, description, isPrivate = false, maxMembers = 50 } = data;

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
      ownerId: String(ownerId),
      ownerName,
      members: [{ userId: String(ownerId), userName: ownerName }],
      memberCount: 1,
      isPrivate: Boolean(isPrivate),
      maxMembers: parseInt(maxMembers),
      isActive: true,
      pendingRequests: [],
    });

    // Log activity
    await RoomActivity.create({
      roomId: room.roomId,
      userId: ownerId,
      userName: ownerName,
      activityType: 'ROOM_CREATED',
    });

    return this._formatRoomResponse(room);
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
      return this._formatRoomResponse(room);
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

      return this._formatRoomResponse(room);
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
      return this._formatRoomResponse(room);
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

    return this._formatRoomResponse(room);
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

    return this._formatRoomResponse(room);
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

    return this._formatRoomResponse(room);
  }

  /**
   * Cập nhật trạng thái phát nhạc
   * @param {string} roomId - ID phòng
   * @param {Object} data - Dữ liệu playback
   * @returns {Promise<Object>} Thông tin phòng
   */
  async updatePlaybackState(roomId, data) {
    const { currentSongId, currentPosition, isPlaying } = data;

    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
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

    return this._formatRoomResponse(room);
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

    // Đảm bảo bài hát tồn tại trong DB
    await songService.saveSongToDB(songId);

    // Thêm vào queue
    const maxOrder = room.queue.length > 0 ? Math.max(...room.queue.map((q) => q.order || 0)) : 0;
    room.queue.push({
      songId,
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
      metadata: { songId },
    });

    return this._formatRoomResponse(room);
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

    return this._formatRoomResponse(room);
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

    // Lấy streaming URLs cho queue (limit 20 bài đầu)
    if (room.queue && room.queue.length > 0) {
      roomData.queueWithUrls = await Promise.all(
        room.queue.slice(0, 20).map(async (item) => {
          try {
            const streamingUrl = await songService.getStreamingUrl(item.songId, true);
            return { ...item, streamingUrl };
          } catch (error) {
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

    return this._formatRoomResponse(room);
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

  /**
   * Format room response - chuẩn hóa dữ liệu trả về
   * @private
   */
  _formatRoomResponse(room) {
    const roomObj = room.toObject ? room.toObject() : room;
    return {
      roomId: roomObj.roomId,
      name: roomObj.name,
      description: roomObj.description,
      ownerId: roomObj.ownerId,
      ownerName: roomObj.ownerName,
      members: roomObj.members || [],
      memberCount: roomObj.memberCount,
      isPrivate: roomObj.isPrivate,
      maxMembers: roomObj.maxMembers,
      currentSongId: roomObj.currentSongId,
      currentPosition: roomObj.currentPosition,
      isPlaying: roomObj.isPlaying,
      lastSyncAt: roomObj.lastSyncAt,
      queue: roomObj.queue || [],
      pendingRequests: roomObj.pendingRequests || [],
      createdAt: roomObj.createdAt,
      updatedAt: roomObj.updatedAt,
    };
  }
}

module.exports = new RoomService();
