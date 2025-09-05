const Album = require('../../models/Album');
const Song = require('../../models/Song');
const Artist = require('../../models/Artist');
const { ZingMp3 } = require('zingmp3-api-full-v3');
const { validationResult } = require('express-validator');

class UserAlbumController {
  // GET /albums
  async getAlbums(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        artist, 
        search,
        sortBy = 'releaseDate',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = { isActive: true };
      
      if (genre) filter.genre = genre;
      if (artist) filter.artist = artist;
      if (search) {
        filter.$text = { $search: search };
      }

      const albums = await Album.find(filter)
        .populate('artist', 'name avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await Album.countDocuments(filter);

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
      console.error('Get albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /albums/{id}
  async getAlbumById(req, res) {
    try {
      const { id } = req.params;

      const album = await Album.findById(id)
        .populate('artist', 'name avatar bio');
      
      if (!album || !album.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      // Get album's songs
      const songs = await Song.find({ 
        album: album.title, 
        isPublic: true, 
        isApproved: true 
      })
      .select('title duration coverImage stats')
      .sort({ trackNumber: 1 });

      res.json({
        success: true,
        data: {
          album,
          songs
        }
      });
    } catch (error) {
      console.error('Get album by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /albums/{id}/songs
  async getAlbumSongs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const album = await Album.findById(id);
      if (!album || !album.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const songs = await Song.find({ 
        album: album.title, 
        isPublic: true, 
        isApproved: true 
      })
      .populate('artist', 'name avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ trackNumber: 1 });

      const total = await Song.countDocuments({ 
        album: album.title, 
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
      console.error('Get album songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /albums/zing/{id} - Get album from ZingMp3
  async getZingAlbum(req, res) {
    try {
      const { id } = req.params;
      
      // Note: ZingMp3 doesn't have direct album endpoint, 
      // but we can get album info from playlist endpoint
      const data = await ZingMp3.getDetailPlaylist(id);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Get Zing album error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get album from ZingMp3'
      });
    }
  }
}

module.exports = new UserAlbumController();
