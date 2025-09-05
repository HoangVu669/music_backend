const Artist = require('../../models/Artist');
const Song = require('../../models/Song');
const Album = require('../../models/Album');
const { ZingMp3 } = require('zingmp3-api-full-v3');
const { validationResult } = require('express-validator');

class UserArtistController {
  // GET /artists
  async getArtists(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        search,
        sortBy = 'totalFollowers',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = { isActive: true };
      
      if (genre) filter.genres = { $in: [genre] };
      if (search) {
        filter.$text = { $search: search };
      }

      const artists = await Artist.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await Artist.countDocuments(filter);

      res.json({
        success: true,
        data: {
          artists,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /artists/{id}
  async getArtistById(req, res) {
    try {
      const { id } = req.params;

      const artist = await Artist.findById(id);
      if (!artist || !artist.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Get artist's songs
      const songs = await Song.find({ 
        artist: id, 
        isPublic: true, 
        isApproved: true 
      })
      .select('title duration coverImage stats')
      .sort({ 'stats.playCount': -1 })
      .limit(10);

      // Get artist's albums
      const albums = await Album.find({ 
        artist: id, 
        isActive: true 
      })
      .select('title coverImage releaseDate totalTracks')
      .sort({ releaseDate: -1 })
      .limit(10);

      res.json({
        success: true,
        data: {
          artist,
          topSongs: songs,
          albums
        }
      });
    } catch (error) {
      console.error('Get artist by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /artists/{id}/songs
  async getArtistSongs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const songs = await Song.find({ 
        artist: id, 
        isPublic: true, 
        isApproved: true 
      })
      .populate('album', 'title coverImage')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

      const total = await Song.countDocuments({ 
        artist: id, 
        isPublic: true, 
        isApproved: true 
      });

      res.json({
        success: true,
        data: {
          songs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get artist songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /artists/{id}/albums
  async getArtistAlbums(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const albums = await Album.find({ 
        artist: id, 
        isActive: true 
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ releaseDate: -1 });

      const total = await Album.countDocuments({ 
        artist: id, 
        isActive: true 
      });

      res.json({
        success: true,
        data: {
          albums,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get artist albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /artists/zing/{name} - Get artist from ZingMp3
  async getZingArtist(req, res) {
    try {
      const { name } = req.params;
      
      const data = await ZingMp3.getArtist(name);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Get Zing artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artist from ZingMp3'
      });
    }
  }

  // GET /artists/zing/{id}/songs - Get artist songs from ZingMp3
  async getZingArtistSongs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, count = 20 } = req.query;
      
      const data = await ZingMp3.getListArtistSong(id, Number(page), Number(count));
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Get Zing artist songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get artist songs from ZingMp3'
      });
    }
  }
}

module.exports = new UserArtistController();
