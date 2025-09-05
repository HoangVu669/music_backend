const Artist = require('../../models/Artist');
const Song = require('../../models/Song');
const Album = require('../../models/Album');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/artists';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

class AdminArtistController {
  // GET /admin/artists
  async getArtists(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = {};
      
      if (genre) filter.genres = { $in: [genre] };
      if (isActive !== undefined) filter.isActive = isActive === 'true';
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

  // GET /admin/artists/{id}
  async getArtistById(req, res) {
    try {
      const { id } = req.params;

      const artist = await Artist.findById(id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Get artist's stats
      const stats = {
        totalSongs: await Song.countDocuments({ artist: id, isPublic: true }),
        totalAlbums: await Album.countDocuments({ artist: id, isActive: true }),
        totalPlayCount: await Song.aggregate([
          { $match: { artist: id, isPublic: true } },
          { $group: { _id: null, total: { $sum: '$stats.playCount' } } }
        ])
      };

      res.json({
        success: true,
        data: {
          artist,
          stats: {
            totalSongs: stats.totalSongs,
            totalAlbums: stats.totalAlbums,
            totalPlayCount: stats.totalPlayCount[0]?.total || 0
          }
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

  // POST /admin/artists
  async createArtist(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, bio, country, genres } = req.body;

      // Check if artist already exists
      const existingArtist = await Artist.findOne({ name });
      if (existingArtist) {
        return res.status(400).json({
          success: false,
          message: 'Artist with this name already exists'
        });
      }

      const artist = new Artist({
        name,
        bio,
        country,
        genres: genres ? genres.split(',').map(genre => genre.trim()) : []
      });

      await artist.save();

      res.status(201).json({
        success: true,
        message: 'Artist created successfully',
        data: artist
      });
    } catch (error) {
      console.error('Create artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/artists/{id}
  async updateArtist(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const artist = await Artist.findById(id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Update artist
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'genres' && typeof updateData[key] === 'string') {
            artist[key] = updateData[key].split(',').map(genre => genre.trim());
          } else {
            artist[key] = updateData[key];
          }
        }
      });

      await artist.save();

      res.json({
        success: true,
        message: 'Artist updated successfully',
        data: artist
      });
    } catch (error) {
      console.error('Update artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /admin/artists/{id}
  async deleteArtist(req, res) {
    try {
      const { id } = req.params;

      const artist = await Artist.findById(id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Check if artist has songs
      const songCount = await Song.countDocuments({ artist: id });
      if (songCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete artist with existing songs'
        });
      }

      // Delete avatar if exists
      if (artist.avatar && fs.existsSync(artist.avatar)) {
        fs.unlinkSync(artist.avatar);
      }

      await Artist.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Artist deleted successfully'
      });
    } catch (error) {
      console.error('Delete artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/artists/{id}/avatar
  async uploadAvatar(req, res) {
    try {
      const { id } = req.params;

      const artist = await Artist.findById(id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Avatar image is required'
        });
      }

      // Delete old avatar if exists
      if (artist.avatar && fs.existsSync(artist.avatar)) {
        fs.unlinkSync(artist.avatar);
      }

      // Update artist with new avatar
      artist.avatar = req.file.path;
      await artist.save();

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: artist.avatar
        }
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { AdminArtistController: new AdminArtistController(), upload };
