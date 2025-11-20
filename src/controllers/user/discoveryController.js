/**
 * Discovery Controller - Artist, Playlist, MV, Suggest
 * Dùng trực tiếp ZingMp3 API cho hiển thị
 */
const zingmp3Service = require('../../services/zingmp3Service');
const formatResponse = require('../../utils/formatResponse');

class DiscoveryController {
  /**
   * GET /api/v1/user/artists
   * Lấy thông tin nghệ sĩ (dùng query param name)
   */
  async getArtist(req, res, next) {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json(formatResponse.failure('Artist name is required', 400));
      }

      const data = await zingmp3Service.getArtist(name);
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/artists/:artistId/songs
   * Lấy danh sách bài hát của nghệ sĩ
   */
  async getArtistSongs(req, res, next) {
    try {
      const { artistId } = req.params;
      const { page = 1, count = 20 } = req.query;

      const data = await zingmp3Service.getArtistSongs(artistId, parseInt(page), parseInt(count));
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/playlists/zing/:playlistId
   * Lấy chi tiết playlist từ ZingMp3
   */
  async getZingPlaylist(req, res, next) {
    try {
      const { playlistId } = req.params;

      const data = await zingmp3Service.getPlaylistDetail(playlistId);
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/mv
   * Lấy danh sách MV
   */
  async getListMV(req, res, next) {
    try {
      const { id, page = 1, count = 20 } = req.query;

      if (!id) {
        return res.status(400).json(formatResponse.failure('ID is required', 400));
      }

      const data = await zingmp3Service.getListMV(id, parseInt(page), parseInt(count));
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/mv/category
   * Lấy danh mục MV
   */
  async getCategoryMV(req, res, next) {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json(formatResponse.failure('Category ID is required', 400));
      }

      const data = await zingmp3Service.getCategoryMV(id);
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/video/:videoId
   * Lấy link video
   */
  async getVideo(req, res, next) {
    try {
      const { videoId } = req.params;

      const data = await zingmp3Service.getVideo(videoId);
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/search/suggest
   * Lấy từ khóa gợi ý
   */
  async getSuggestKeyword(req, res, next) {
    try {
      const data = await zingmp3Service.getSuggestKeyword();
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/albums/:albumId
   * Lấy chi tiết album từ ZingMp3
   */
  async getAlbum(req, res, next) {
    try {
      const { albumId } = req.params;

      const data = await zingmp3Service.getAlbumDetail(albumId);
      res.json(formatResponse.success(data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DiscoveryController();

