/**
 * Song Controller - User APIs
 */
const songService = require('../../services/user/songService');
const formatResponse = require('../../utils/formatResponse');

class SongController {
  /**
   * GET /api/v1/user/songs/:songId
   * Lấy thông tin bài hát với streaming URL
   */
  async getSong(req, res, next) {
    try {
      const { songId } = req.params;
      const userId = req.user?.id || null;
      const cache = req.query.cache !== 'false'; // Default: cache = true

      const song = await songService.getSongWithStream(songId, userId, cache);

      res.json(formatResponse.success(song));
    } catch (error) {
      // Check if error is about song not found
      if (error.message && error.message.includes('Song not found')) {
        return res.status(404).json(formatResponse.failure(error.message, 404));
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/:songId/stream
   * Lấy streaming URL (có thể cache)
   */
  async getStreamingUrl(req, res, next) {
    try {
      const { songId } = req.params;
      const cache = req.query.cache !== 'false';

      const streamingUrl = await songService.getStreamingUrl(songId, cache);

      res.json(formatResponse.success({ streamingUrl }));
    } catch (error) {
      // Check if error is about song not found or failed to get streaming URL
      if (error.message && (error.message.includes('Song not found') || error.message.includes('Failed to get streaming URL'))) {
        return res.status(404).json(formatResponse.failure(error.message, 404));
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/:songId/lyric
   * Lấy lời bài hát
   */
  async getLyric(req, res, next) {
    try {
      const { songId } = req.params;

      const lyricData = await songService.getLyric(songId);

      res.json(formatResponse.success(lyricData));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/search
   * Tìm kiếm bài hát
   */
  async search(req, res, next) {
    try {
      const { keyword, limit = 20 } = req.query;

      if (!keyword) {
        return res.status(400).json(formatResponse.error('Keyword is required'));
      }

      const results = await songService.search(keyword, parseInt(limit));

      res.json(formatResponse.success(results));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/popular
   * Lấy bài hát phổ biến
   */
  async getPopularSongs(req, res, next) {
    try {
      const { limit = 20 } = req.query;

      const songs = await songService.getPopularSongs(parseInt(limit));

      res.json(formatResponse.success(songs));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/songs/new-releases
   * Lấy bài hát mới phát hành
   */
  async getNewReleases(req, res, next) {
    try {
      const { limit = 20 } = req.query;

      const songs = await songService.getNewReleases(parseInt(limit));

      res.json(formatResponse.success(songs));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/user/songs/:songId/play
   * Track lịch sử nghe nhạc
   */
  async trackPlay(req, res, next) {
    try {
      const { songId } = req.params;
      const userId = req.user?.id;
      const { playDuration, playPercentage, isCompleted, isSkipped, context, device } = req.body;

      if (!userId) {
        return res.status(401).json(formatResponse.error('Authentication required'));
      }

      await songService.trackPlayHistory(userId, songId, {
        playDuration,
        playPercentage,
        isCompleted,
        isSkipped,
        context,
        device,
      });

      res.json(formatResponse.success({ tracked: true }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SongController();

