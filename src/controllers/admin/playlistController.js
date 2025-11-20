/**
 * Admin Playlist Controller
 */
const Playlist = require('../../models/Playlist');
const formatResponse = require('../../utils/formatResponse');

class AdminPlaylistController {
  async listPlaylists(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const playlists = await Playlist.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Playlist.countDocuments();

      res.json(formatResponse.success({ playlists, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (error) {
      next(error);
    }
  }

  async getPlaylistById(req, res, next) {
    try {
      const playlist = await Playlist.findOne({ playlistId: req.params.id });
      if (!playlist) return res.status(404).json(formatResponse.failure('Playlist not found', 404));
      res.json(formatResponse.success({ playlist }));
    } catch (error) {
      next(error);
    }
  }

  async updatePlaylistById(req, res, next) {
    try {
      const playlist = await Playlist.findOne({ playlistId: req.params.id });
      if (!playlist) return res.status(404).json(formatResponse.failure('Playlist not found', 404));
      Object.assign(playlist, req.body);
      await playlist.save();
      res.json(formatResponse.success({ playlist }));
    } catch (error) {
      next(error);
    }
  }

  async deletePlaylistById(req, res, next) {
    try {
      const playlist = await Playlist.findOne({ playlistId: req.params.id });
      if (!playlist) return res.status(404).json(formatResponse.failure('Playlist not found', 404));
      await Playlist.deleteOne({ playlistId: req.params.id });
      res.json(formatResponse.success({ deleted: true }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminPlaylistController();

