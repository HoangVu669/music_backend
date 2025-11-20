/**
 * Admin Song Controller
 */
const Song = require('../../models/Song');
const formatResponse = require('../../utils/formatResponse');
const zingmp3Service = require('../../services/zingmp3Service');
const { mapSongToModel } = require('../../schedule/utils/dataMapper');

class AdminSongController {
  async listSongs(req, res, next) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { songId: { $regex: search, $options: 'i' } },
        ];
      }

      const songs = await Song.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Song.countDocuments(query);

      res.json(formatResponse.success({ songs, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (error) {
      next(error);
    }
  }

  async createSong(req, res, next) {
    try {
      const song = await Song.create(req.body);
      res.status(201).json(formatResponse.success({ song }));
    } catch (error) {
      next(error);
    }
  }

  async getSongById(req, res, next) {
    try {
      const song = await Song.findOne({ songId: req.params.id });
      if (!song) return res.status(404).json(formatResponse.failure('Song not found', 404));
      res.json(formatResponse.success({ song }));
    } catch (error) {
      next(error);
    }
  }

  async updateSongById(req, res, next) {
    try {
      const song = await Song.findOne({ songId: req.params.id });
      if (!song) return res.status(404).json(formatResponse.failure('Song not found', 404));
      Object.assign(song, req.body);
      await song.save();
      res.json(formatResponse.success({ song }));
    } catch (error) {
      next(error);
    }
  }

  async deleteSongById(req, res, next) {
    try {
      const song = await Song.findOne({ songId: req.params.id });
      if (!song) return res.status(404).json(formatResponse.failure('Song not found', 404));
      await Song.deleteOne({ songId: req.params.id });
      res.json(formatResponse.success({ deleted: true }));
    } catch (error) {
      next(error);
    }
  }

  async topLikedSongs(req, res, next) {
    try {
      const { limit = 20 } = req.query;
      const songs = await Song.find()
        .sort({ likeCount: -1 })
        .limit(parseInt(limit));
      res.json(formatResponse.success({ songs }));
    } catch (error) {
      next(error);
    }
  }

  async syncSongFromZing(req, res, next) {
    try {
      const { zingId } = req.params;
      const songInfo = await zingmp3Service.getSongInfo(zingId);
      const streamData = await zingmp3Service.getSongStream(zingId);
      const songData = mapSongToModel(songInfo, streamData['128']);
      
      let song = await Song.findOne({ songId: zingId });
      if (song) {
        Object.assign(song, songData);
        await song.save();
      } else {
        song = await Song.create(songData);
      }

      res.json(formatResponse.success({ song }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminSongController();

