/**
 * ZingMp3 Controller - Direct integration với zingmp3-api-full-v3
 * Thay thế cho việc gọi HTTP external
 */
const { ZingMp3 } = require('zingmp3-api-full-v3');
const formatResponse = require('../utils/formatResponse');

class ZingMp3Controller {
  /**
   * GET /api/zing/song
   * Lấy streaming URL
   */
  async getSong(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Song ID is required', 400));
      }
      const data = await ZingMp3.getSong(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/infosong
   * Lấy thông tin bài hát
   */
  async getInfoSong(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Song ID is required', 400));
      }
      const data = await ZingMp3.getInfoSong(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/lyric
   * Lấy lời bài hát
   */
  async getLyric(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Song ID is required', 400));
      }
      const data = await ZingMp3.getLyric(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/home
   * Lấy dữ liệu trang chủ
   */
  async getHome(req, res, next) {
    try {
      const data = await ZingMp3.getHome();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/top100
   * Lấy Top 100
   */
  async getTop100(req, res, next) {
    try {
      const data = await ZingMp3.getTop100();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/charthome
   * Lấy Chart Home
   */
  async getChartHome(req, res, next) {
    try {
      const data = await ZingMp3.getChartHome();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/newreleasechart
   * Lấy New Release Chart
   */
  async getNewReleaseChart(req, res, next) {
    try {
      const data = await ZingMp3.getNewReleaseChart();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/search
   * Tìm kiếm
   */
  async search(req, res, next) {
    try {
      const { keyword } = req.query;
      if (!keyword) {
        return res.status(400).json(formatResponse.failure('Keyword is required', 400));
      }
      const data = await ZingMp3.search(keyword);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/artist
   * Lấy thông tin nghệ sĩ
   */
  async getArtist(req, res, next) {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json(formatResponse.failure('Artist name is required', 400));
      }
      const data = await ZingMp3.getArtist(name);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/artistsong
   * Lấy danh sách bài hát của nghệ sĩ
   */
  async getArtistSong(req, res, next) {
    try {
      const { id, page = 1, count = 20 } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Artist ID is required', 400));
      }
      const data = await ZingMp3.getListArtistSong(id, parseInt(page), parseInt(count));
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/detailplaylist
   * Lấy chi tiết playlist
   */
  async getDetailPlaylist(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Playlist ID is required', 400));
      }
      const data = await ZingMp3.getDetailPlaylist(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/listmv
   * Lấy danh sách MV
   */
  async getListMV(req, res, next) {
    try {
      const { id, page = 1, count = 20 } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('ID is required', 400));
      }
      const data = await ZingMp3.getListMV(id, parseInt(page), parseInt(count));
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/categorymv
   * Lấy danh mục MV
   */
  async getCategoryMV(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Category ID is required', 400));
      }
      const data = await ZingMp3.getCategoryMV(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/video
   * Lấy link video
   */
  async getVideo(req, res, next) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json(formatResponse.failure('Video ID is required', 400));
      }
      const data = await ZingMp3.getVideo(id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/zing/suggest
   * Lấy từ khóa gợi ý
   */
  async getSuggestKeyword(req, res, next) {
    try {
      const data = await ZingMp3.Suggest();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ZingMp3Controller();


