/**
 * Room Controller - Real-time Group Music Listening
 * Clean Code: Controller chỉ xử lý HTTP request/response, business logic ở Service
 */
const roomService = require('../../services/user/roomService');
const userSearchService = require('../../services/user/userSearchService');
const formatResponse = require('../../utils/formatResponse');
const AppError = require('../../utils/AppError');

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

      res.status(201).json(formatResponse.success(room, 'CREATED', 'Tạo phòng thành công'));
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
      const userId = req.user?.id || null;

      const room = await roomService.getRoomWithSongs(roomId, userId);

      res.json(formatResponse.success(room));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/join
   * Tham gia phòng
   * - Phòng công khai: tham gia ngay
   * - Phòng riêng tư: gửi yêu cầu, chờ chủ phòng duyệt
   */
  async joinRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      const userName = req.user.username || req.user.fullname || 'User';

      try {
        const room = await roomService.joinRoom(roomId, userId, userName);
        res.json(formatResponse.success(room, 'SUCCESS', 'Tham gia phòng thành công'));
      } catch (error) {
        // Xử lý trường hợp pending approval
        if (error instanceof AppError && error.responseCode === 'PENDING_APPROVAL') {
          res.status(202).json(
            formatResponse.success(
              { roomId, status: 'pending' },
              'PENDING_APPROVAL',
              error.message
            )
          );
        } else {
          throw error;
        }
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/leave
   * Rời phòng
   */
  async leaveRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      const room = await roomService.leaveRoom(roomId, userId);

      res.json(formatResponse.success(room, 'SUCCESS', 'Rời phòng thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/requests/:userId/accept
   * Chấp nhận yêu cầu tham gia phòng (chỉ chủ phòng)
   */
  async acceptJoinRequest(req, res, next) {
    try {
      const { roomId, userId: requestUserId } = req.params;
      const ownerId = req.user.id;

      const room = await roomService.acceptJoinRequest(roomId, ownerId, requestUserId);

      res.json(formatResponse.success(room, 'SUCCESS', 'Chấp nhận yêu cầu thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/requests/:userId/reject
   * Từ chối yêu cầu tham gia phòng (chỉ chủ phòng)
   */
  async rejectJoinRequest(req, res, next) {
    try {
      const { roomId, userId: requestUserId } = req.params;
      const ownerId = req.user.id;

      const room = await roomService.rejectJoinRequest(roomId, ownerId, requestUserId);

      res.json(formatResponse.success(room, 'SUCCESS', 'Từ chối yêu cầu thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/:roomId/requests
   * Lấy danh sách yêu cầu tham gia phòng (chỉ chủ phòng)
   */
  async getPendingRequests(req, res, next) {
    try {
      const { roomId } = req.params;
      const ownerId = req.user.id;

      const requests = await roomService.getPendingRequests(roomId, ownerId);

      res.json(formatResponse.success(requests));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/:roomId/invite
   * Gửi lời mời vào phòng (chỉ chủ phòng)
   */
  async inviteUser(req, res, next) {
    try {
      const { roomId } = req.params;
      const { inviteeId, message } = req.body;
      const ownerId = req.user.id;

      if (!inviteeId) {
        throw new AppError('VALIDATION_ERROR', 'inviteeId là bắt buộc');
      }

      const invitation = await roomService.inviteUser(roomId, ownerId, inviteeId, message);

      res.status(201).json(
        formatResponse.success(invitation, 'CREATED', 'Gửi lời mời thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/invitations
   * Lấy danh sách lời mời của user
   */
  async getMyInvitations(req, res, next) {
    try {
      const userId = req.user.id;

      const invitations = await roomService.getUserInvitations(userId);

      res.json(formatResponse.success(invitations));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/invitations/:invitationId/accept
   * Chấp nhận lời mời vào phòng
   */
  async acceptInvitation(req, res, next) {
    try {
      const { invitationId } = req.params;
      const userId = req.user.id;

      const room = await roomService.acceptInvitation(invitationId, userId);

      res.json(formatResponse.success(room, 'SUCCESS', 'Chấp nhận lời mời thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/rooms/invitations/:invitationId/reject
   * Từ chối lời mời vào phòng
   */
  async rejectInvitation(req, res, next) {
    try {
      const { invitationId } = req.params;
      const userId = req.user.id;

      const result = await roomService.rejectInvitation(invitationId, userId);

      res.json(formatResponse.success(result, 'SUCCESS', 'Từ chối lời mời thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/users/search
   * Tìm kiếm người dùng (để mời vào phòng)
   */
  async searchUsers(req, res, next) {
    try {
      const { keyword, limit } = req.query;
      const userId = req.user.id;

      if (!keyword || keyword.trim().length === 0) {
        return res.json(formatResponse.success([]));
      }

      const users = await userSearchService.searchUsers(keyword.trim(), parseInt(limit) || 20, userId);

      res.json(formatResponse.success(users));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/rooms/:roomId/playback
   * Cập nhật trạng thái phát nhạc
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

      res.json(formatResponse.success(room, 'UPDATED', 'Cập nhật trạng thái phát nhạc thành công'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/rooms/:roomId/queue
   * Lấy danh sách bài hát trong queue
   */
  async getQueue(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user?.id || null;

      const room = await roomService.getRoomWithSongs(roomId, userId);

      res.json(
        formatResponse.success({
          queue: room.queueWithUrls || room.queue || [],
          currentSongId: room.currentSongId,
          currentSongStreamingUrl: room.currentSongStreamingUrl,
          currentPosition: room.currentPosition,
          isPlaying: room.isPlaying,
          lastSyncAt: room.lastSyncAt,
        })
      );
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

      if (!songId) {
        throw new AppError('VALIDATION_ERROR', 'songId là bắt buộc');
      }

      const room = await roomService.addSongToQueue(roomId, songId, userId);

      res.status(201).json(
        formatResponse.success(room, 'CREATED', 'Thêm bài hát vào danh sách phát thành công')
      );
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

      res.json(formatResponse.success(room, 'DELETED', 'Xóa bài hát khỏi danh sách phát thành công'));
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
      const { limit } = req.query;

      const rooms = await roomService.getPublicRooms(parseInt(limit) || 20);

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
