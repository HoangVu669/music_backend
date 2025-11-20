/**
 * Admin Artist Controller
 */
const Artist = require('../../models/Artist');
const formatResponse = require('../../utils/formatResponse');

class AdminArtistController {
  async listArtists(req, res, next) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { artistId: { $regex: search, $options: 'i' } },
        ];
      }

      const artists = await Artist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Artist.countDocuments(query);

      res.json(formatResponse.success({ artists, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (error) {
      next(error);
    }
  }

  async createArtist(req, res, next) {
    try {
      const artist = await Artist.create(req.body);
      res.status(201).json(formatResponse.success({ artist }));
    } catch (error) {
      next(error);
    }
  }

  async getArtistById(req, res, next) {
    try {
      const artist = await Artist.findOne({ artistId: req.params.id });
      if (!artist) return res.status(404).json(formatResponse.failure('Artist not found', 404));
      res.json(formatResponse.success({ artist }));
    } catch (error) {
      next(error);
    }
  }

  async updateArtistById(req, res, next) {
    try {
      const artist = await Artist.findOne({ artistId: req.params.id });
      if (!artist) return res.status(404).json(formatResponse.failure('Artist not found', 404));
      Object.assign(artist, req.body);
      await artist.save();
      res.json(formatResponse.success({ artist }));
    } catch (error) {
      next(error);
    }
  }

  async deleteArtistById(req, res, next) {
    try {
      const artist = await Artist.findOne({ artistId: req.params.id });
      if (!artist) return res.status(404).json(formatResponse.failure('Artist not found', 404));
      await Artist.deleteOne({ artistId: req.params.id });
      res.json(formatResponse.success({ deleted: true }));
    } catch (error) {
      next(error);
    }
  }

  async syncArtistSongs(req, res, next) {
    try {
      // Placeholder - implement later if needed
      res.json(formatResponse.success({ message: 'Sync artist songs - to be implemented' }));
    } catch (error) {
      next(error);
    }
  }

  async syncArtistPlaylists(req, res, next) {
    try {
      // Placeholder - implement later if needed
      res.json(formatResponse.success({ message: 'Sync artist playlists - to be implemented' }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminArtistController();

