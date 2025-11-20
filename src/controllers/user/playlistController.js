/**
 * Playlist Controller - Quản lý playlist
 */
const playlistService = require('../../services/user/playlistService');
const formatResponse = require('../../utils/formatResponse');
class PlaylistController {
  /**
   * POST /api/v1/user/playlists
   * Tạo playlist mới
   */
  async createPlaylist(req, res, next) {
    try {
      const userId = req.user.id;
      const { title, description, isPublic, thumbnail } = req.body;

      if (!title) {
        return res.status(400).json(formatResponse.error('Title is required'));
      }

      const playlist = await playlistService.createPlaylist(userId, {
        title,
        description,
        isPublic,
        thumbnail,
      });

      res.status(201).json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/playlists
   * Lấy playlists của user
   */
  async getMyPlaylists(req, res, next) {
    try {
      const userId = req.user.id;
      const { isPublic } = req.query;

      const playlists = await playlistService.getUserPlaylists(
        userId,
        isPublic === 'true' ? true : isPublic === 'false' ? false : null
      );

      res.json(formatResponse.success(playlists));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/playlists/:playlistId
   * Lấy chi tiết playlist
   */
  async getPlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user?.id || null;

      const playlist = await playlistService.getPlaylistById(playlistId, userId);

      res.json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/playlists/:playlistId
   * Cập nhật playlist
   */
  async updatePlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;
      const { title, description, thumbnail, isPublic } = req.body;

      const playlist = await playlistService.updatePlaylist(playlistId, userId, {
        title,
        description,
        thumbnail,
        isPublic,
      });

      res.json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/user/playlists/:playlistId
   * Xóa playlist
   */
  async deletePlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;

      const result = await playlistService.deletePlaylist(playlistId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/playlists/:playlistId/songs
   * Thêm bài hát vào playlist
   */
  async addSong(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;
      const { songId } = req.body;

      if (!songId) {
        return res.status(400).json(formatResponse.error('songId is required'));
      }

      const playlist = await playlistService.addSongToPlaylist(playlistId, songId, userId);

      res.json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/user/playlists/:playlistId/songs/:songId
   * Xóa bài hát khỏi playlist
   */
  async removeSong(req, res, next) {
    try {
      const { playlistId, songId } = req.params;
      const userId = req.user.id;

      const playlist = await playlistService.removeSongFromPlaylist(playlistId, songId, userId);

      res.json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/user/playlists/:playlistId/reorder
   * Sắp xếp lại thứ tự bài hát
   */
  async reorderSongs(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;
      const { songIds } = req.body;

      if (!Array.isArray(songIds)) {
        return res.status(400).json(formatResponse.error('songIds must be an array'));
      }

      const playlist = await playlistService.reorderPlaylistSongs(playlistId, userId, songIds);

      res.json(formatResponse.success(playlist));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/playlists/:playlistId/like
   * Like/Unlike playlist
   */
  async likePlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;

      const result = await playlistService.likePlaylist(playlistId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/playlists/:playlistId/follow
   * Follow/Unfollow playlist
   */
  async followPlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;
      const userId = req.user.id;

      const result = await playlistService.followPlaylist(playlistId, userId);

      res.json(formatResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/playlists/public
   * Lấy playlists công khai
   */
  async getPublicPlaylists(req, res, next) {
    try {
      const { limit = 20, sortBy = 'playCount' } = req.query;

      const playlists = await playlistService.getPublicPlaylists(parseInt(limit), sortBy);

      res.json(formatResponse.success(playlists));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/playlists/followed
   * Lấy playlists đã follow
   */
  async getFollowedPlaylists(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const playlists = await playlistService.getFollowedPlaylists(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json(formatResponse.success(playlists));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlaylistController();

