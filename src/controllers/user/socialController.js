/**
 * Social Controller - Tương tác xã hội
 */
const socialService = require('../../services/user/socialService');
const formatResponse = require('../../utils/formatResponse');

class SocialController {
  /**
   * ===== COMMENTS =====
   */

  /**
   * POST /api/v1/user/songs/:songId/comments
   * Comment bài hát
   */
  async commentSong(req, res, next) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;
      const userName = req.user.username || req.user.fullname || 'User';
      const userAvatar = req.user.avatar || null;
      const { content, timestamp } = req.body;

      if (!content) {
        return res.status(400).json(formatResponse.error('Content is required'));
      }

      const comment = await socialService.commentSong(
        songId,
        userId,
        userName,
        userAvatar,
        content,
        timestamp
      );

      res.status(201).json(formatResponse.success(comment));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/:songId/comments
   * Lấy comments của bài hát
   */
  async getSongComments(req, res, next) {
    try {
      const { songId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const comments = await socialService.getSongComments(
        songId,
        parseInt(page),
        parseInt(limit)
      );

      res.json(formatResponse.success(comments));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/comments/:commentId/reply
   * Reply comment
   */
  async replyComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      const userName = req.user.username || req.user.fullname || 'User';
      const userAvatar = req.user.avatar || null;
      const { songId, content, mentionedUserId } = req.body;

      if (!content || !songId) {
        return res.status(400).json(formatResponse.error('Content and songId are required'));
      }

      const reply = await socialService.replyComment(
        commentId,
        songId,
        userId,
        userName,
        userAvatar,
        content,
        mentionedUserId
      );

      res.status(201).json(formatResponse.success(reply));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/comments/:commentId/like
   * Like/Unlike comment
   */
  async likeComment(req, res, next) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const comment = await socialService.likeComment(commentId, userId);

      res.json(formatResponse.success(comment));
    } catch (error) {
      next(error);
    }
  }

  /**
   * ===== LIKES =====
   */

  /**
   * POST /api/v1/user/songs/:songId/like
   * Like/Unlike bài hát
   */
  async likeSong(req, res, next) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;

      const result = await socialService.likeSong(songId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/albums/:albumId/like
   * Like/Unlike album
   */
  async likeAlbum(req, res, next) {
    try {
      const { albumId } = req.params;
      const userId = req.user.id;

      const result = await socialService.likeAlbum(albumId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/likes
   * Kiểm tra user đã like chưa
   */
  async checkLikes(req, res, next) {
    try {
      const userId = req.user.id;
      const { songIds = '', albumIds = '' } = req.query;

      const songIdArray = songIds ? songIds.split(',').filter(Boolean) : [];
      const albumIdArray = albumIds ? albumIds.split(',').filter(Boolean) : [];

      const result = await socialService.checkUserLikes(userId, songIdArray, albumIdArray);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/likes/songs
   * Lấy danh sách bài hát đã like
   */
  async getLikedSongs(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const songs = await socialService.getLikedSongs(userId, parseInt(page), parseInt(limit));

      res.json(formatResponse.success(songs));
    } catch (error) {
      next(error);
    }
  }

  /**
   * ===== FOLLOW =====
   */

  /**
   * POST /api/v1/user/users/:userId/follow
   * Follow/Unfollow user
   */
  async followUser(req, res, next) {
    try {
      const { userId: followingId } = req.params;
      const followerId = req.user.id;

      const result = await socialService.followUser(followerId, followingId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/artists/:artistId/follow
   * Follow/Unfollow artist
   */
  async followArtist(req, res, next) {
    try {
      const { artistId } = req.params;
      const userId = req.user.id;

      const result = await socialService.followArtist(artistId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/follows/artists
   * Lấy danh sách artists đã follow
   */
  async getFollowedArtists(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const artists = await socialService.getFollowedArtists(userId, parseInt(page), parseInt(limit));

      res.json(formatResponse.success(artists));
    } catch (error) {
      next(error);
    }
  }

  /**
   * ===== SHARE =====
   */

  /**
   * POST /api/v1/user/songs/:songId/share
   * Share bài hát
   */
  async shareSong(req, res, next) {
    try {
      const { songId } = req.params;
      const userId = req.user.id;
      const { shareType = 'LINK' } = req.body;

      const share = await socialService.shareSong(songId, userId, shareType);

      res.status(201).json(formatResponse.success(share));
    } catch (error) {
      next(error);
    }
  }

  /**
   * ===== NOTIFICATIONS =====
   */

  /**
   * GET /api/v1/user/notifications
   * Lấy notifications của user
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const notifications = await socialService.getUserNotifications(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json(formatResponse.success(notifications));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/notifications/:notificationId/read
   * Đánh dấu notification đã đọc
   */
  async markNotificationAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await socialService.markNotificationAsRead(notificationId, userId);

      res.json(formatResponse.success({ read: true }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/notifications/read-all
   * Đánh dấu tất cả notifications đã đọc
   */
  async markAllNotificationsAsRead(req, res, next) {
    try {
      const userId = req.user.id;

      await socialService.markAllNotificationsAsRead(userId);

      res.json(formatResponse.success({ read: true }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/notifications/unread-count
   * Đếm số notifications chưa đọc
   */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;

      const count = await socialService.getUnreadNotificationCount(userId);

      res.json(formatResponse.success({ count }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SocialController();

