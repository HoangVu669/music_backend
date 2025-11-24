/**
 * Room Service - Real-time group listening
 */
const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const RoomChat = require('../../models/RoomChat');
const RoomInvitation = require('../../models/RoomInvitation');
const { generateUniqueRandomId } = require('../../utils/generateId');
const songService = require('./songService');

class RoomService {
  /**
   * Tạo phòng mới
   */
  async createRoom(ownerId, ownerName, data = {}) {
    const { name, description, isPrivate = false, maxMembers = 50 } = data;

    const room = await Room.create({
      roomId: await generateUniqueRandomId(Room, 'roomId'),
      name: name || `${ownerName}'s Room`,
      description,
      ownerId: String(ownerId),
      ownerName,
      members: [{ userId: String(ownerId), userName: ownerName }],
      memberCount: 1,
      isPrivate,
      maxMembers,
      isActive: true,
    });

    // Log activity
    await RoomActivity.create({
      roomId: room.roomId,
      userId: ownerId,
      userName: ownerName,
      activityType: 'ROOM_CREATED',
    });

    return room;
  }

  /**
   * Join phòng
   */
  async joinRoom(roomId, userId, userName) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    // Kiểm tra đã join chưa
    const existingMember = room.members.find(m => String(m.userId) === String(userId));
    if (existingMember) {
      return room;
    }

    // Kiểm tra số lượng thành viên
    if (room.memberCount >= room.maxMembers) {
      throw new Error('Room is full');
    }

    // Thêm member
    room.members.push({ userId: String(userId), userName });
    room.memberCount += 1;
    await room.save();

    // Log activity
    await RoomActivity.create({
      roomId,
      userId,
      userName,
      activityType: 'USER_JOINED',
    });

    return room;
  }

  /**
   * Leave phòng
   */
  async leaveRoom(roomId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    // Xóa member
    room.members = room.members.filter(m => m.userId !== userId);
    room.memberCount = Math.max(0, room.memberCount - 1);
    await room.save();

    // Log activity
    const user = room.members.find(m => m.userId === userId);
    await RoomActivity.create({
      roomId,
      userId,
      userName: user?.userName || 'Unknown',
      activityType: 'USER_LEFT',
    });

    return room;
  }

  /**
   * Update playback state
   */
  async updatePlaybackState(roomId, data) {
    const { currentSongId, currentPosition, isPlaying } = data;

    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    room.currentSongId = currentSongId;
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

    return room;
  }

  /**
   * Thêm bài hát vào queue
   */
  async addSongToQueue(roomId, songId, addedBy) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    // Kiểm tra user đã join room chưa
    const isMember = room.members.some(m => String(m.userId) === String(addedBy));
    if (!isMember) {
      throw new Error('User must join room before adding songs');
    }

    // Kiểm tra bài hát đã có trong queue chưa
    const existing = room.queue.find(q => q.songId === songId);
    if (existing) {
      throw new Error('Song already in queue');
    }

    // Đảm bảo bài hát tồn tại trong DB trước khi thêm vào queue
    await songService.saveSongToDB(songId);

    // Thêm vào queue
    room.queue.push({
      songId,
      addedBy: String(addedBy),
      order: room.queue.length + 1,
    });
    await room.save();

    // Log activity
    const user = room.members.find(m => m.userId === addedBy);
    await RoomActivity.create({
      roomId,
      userId: addedBy,
      userName: user?.userName || 'Unknown',
      activityType: 'SONG_ADDED',
      metadata: { songId },
    });

    return room;
  }

  /**
   * Xóa bài hát khỏi queue
   */
  async removeSongFromQueue(roomId, songId, userId) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    // Chỉ owner hoặc người thêm bài mới được xóa
    const queueItem = room.queue.find(q => q.songId === songId);
    if (!queueItem) {
      throw new Error('Song not in queue');
    }

    if (room.ownerId !== userId && queueItem.addedBy !== userId) {
      throw new Error('Not authorized to remove this song');
    }

    room.queue = room.queue.filter(q => q.songId !== songId);
    await room.save();

    // Log activity
    const user = room.members.find(m => m.userId === userId);
    await RoomActivity.create({
      roomId,
      userId,
      userName: user?.userName || 'Unknown',
      activityType: 'SONG_REMOVED',
      metadata: { songId },
    });

    return room;
  }

  /**
   * Lấy thông tin phòng với streaming URLs
   */
  async getRoomWithSongs(roomId, userId = null) {
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      throw new Error('Room not found');
    }

    const roomData = room.toObject();
    
    // Kiểm tra user có phải owner không
    if (userId) {
      const userIdString = String(userId);
      roomData.isOwner = room.ownerId && String(room.ownerId) === userIdString;
      
      // Kiểm tra user có phải member không
      const isMember = room.members.some(m => String(m.userId) === userIdString);
      roomData.isMember = isMember || roomData.isOwner;
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

    // Lấy streaming URLs cho queue (limit 10 bài đầu)
    if (room.queue && room.queue.length > 0) {
      roomData.queueWithUrls = await Promise.all(
        room.queue.slice(0, 10).map(async (item) => {
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
   */
  async getPublicRooms(limit = 20) {
    return Room.find({ isPrivate: false, isActive: true })
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(limit)
      .select('roomId name description ownerName memberCount currentSongId isPlaying');
  }

  /**
   * Lấy phòng của user
   */
  async getUserRooms(userId) {
    return Room.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId },
      ],
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .select('roomId name description ownerName memberCount currentSongId isPlaying');
  }
}

module.exports = new RoomService();

