/**
 * Room Controller - Real-time group listening
 */
const roomService = require('../../services/user/roomService');
const formatResponse = require('../../utils/formatResponse');
class RoomController {
  /**
   * POST /api/v1/user/rooms
   * Tạo phòng mới
   */
  async createRoom(req, res, next) {
    try {
      const userId = req.user.id;
      const userName = req.user.username || req.user.fullname || 'User';
      const { name, description, isPrivate, maxMembers } = req.body;

      const room = await roomService.createRoom(userId, userName, {
        name,
        description,
        isPrivate,
        maxMembers,
      });

      res.status(201).json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/:roomId
   * Lấy thông tin phòng với streaming URLs
   */
  async getRoom(req, res, next) {
    try {
      const { roomId } = req.params;

      const room = await roomService.getRoomWithSongs(roomId);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/join
   * Join phòng
   */
  async joinRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const userName = req.user.username || req.user.fullname || 'User';

      const room = await roomService.joinRoom(roomId, userId, userName);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/leave
   * Leave phòng
   */
  async leaveRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await roomService.leaveRoom(roomId, userId);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/rooms/:roomId/playback
   * Update playback state (play/pause/seek)
   */
  async updatePlayback(req, res, next) {
    try {
      const { roomId } = req.params;
      const { currentSongId, currentPosition, isPlaying } = req.body;

      const room = await roomService.updatePlaybackState(roomId, {
        currentSongId,
        currentPosition,
        isPlaying,
      });

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/queue
   * Thêm bài hát vào queue
   */
  async addSongToQueue(req, res, next) {
    try {
      const { roomId } = req.params;
      const { songId } = req.body;
      const userId = req.user.id;

      const room = await roomService.addSongToQueue(roomId, songId, userId);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/user/rooms/:roomId/queue/:songId
   * Xóa bài hát khỏi queue
   */
  async removeSongFromQueue(req, res, next) {
    try {
      const { roomId, songId } = req.params;
      const userId = req.user.id;

      const room = await roomService.removeSongFromQueue(roomId, songId, userId);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/public
   * Lấy danh sách phòng công khai
   */
  async getPublicRooms(req, res, next) {
    try {
      const { limit = 20 } = req.query;

      const rooms = await roomService.getPublicRooms(parseInt(limit));

      res.json(formatResponse.success(rooms));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/my-rooms
   * Lấy phòng của user
   */
  async getMyRooms(req, res, next) {
    try {
      const userId = req.user.id;

      const rooms = await roomService.getUserRooms(userId);

      res.json(formatResponse.success(rooms));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoomController();

