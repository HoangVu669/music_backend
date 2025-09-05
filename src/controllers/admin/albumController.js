const Album = require('../../models/Album');
const Artist = require('../../models/Artist');
const Song = require('../../models/Song');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

// Configure multer for cover uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/albums';
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

class AdminAlbumController {
  // GET /admin/albums
  async getAlbums(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        artist, 
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
      
      if (genre) filter.genre = genre;
      if (artist) filter.artist = artist;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
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

  // GET /admin/albums/{id}
  async getAlbumById(req, res) {
    try {
      const { id } = req.params;

      const album = await Album.findById(id)
        .populate('artist', 'name avatar bio');

      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      // Get album's songs
      const songs = await Song.find({ 
        album: album.title, 
        isPublic: true 
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

  // POST /admin/albums
  async createAlbum(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, artist, description, genre, releaseDate } = req.body;

      // Check if artist exists
      const artistExists = await Artist.findById(artist);
      if (!artistExists) {
        return res.status(400).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Check if album already exists for this artist
      const existingAlbum = await Album.findOne({ title, artist });
      if (existingAlbum) {
        return res.status(400).json({
          success: false,
          message: 'Album with this title already exists for this artist'
        });
      }

      const album = new Album({
        title,
        artist,
        description,
        genre,
        releaseDate: releaseDate ? new Date(releaseDate) : new Date()
      });

      await album.save();

      res.status(201).json({
        success: true,
        message: 'Album created successfully',
        data: album
      });
    } catch (error) {
      console.error('Create album error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/albums/{id}
  async updateAlbum(req, res) {
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

      const album = await Album.findById(id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      // Update album
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'releaseDate') {
            album[key] = new Date(updateData[key]);
          } else {
            album[key] = updateData[key];
          }
        }
      });

      await album.save();

      res.json({
        success: true,
        message: 'Album updated successfully',
        data: album
      });
    } catch (error) {
      console.error('Update album error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /admin/albums/{id}
  async deleteAlbum(req, res) {
    try {
      const { id } = req.params;

      const album = await Album.findById(id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      // Check if album has songs
      const songCount = await Song.countDocuments({ album: album.title });
      if (songCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete album with existing songs'
        });
      }

      // Delete cover image if exists
      if (album.coverImage && fs.existsSync(album.coverImage)) {
        fs.unlinkSync(album.coverImage);
      }

      await Album.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Album deleted successfully'
      });
    } catch (error) {
      console.error('Delete album error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/albums/{id}/cover
  async uploadCover(req, res) {
    try {
      const { id } = req.params;

      const album = await Album.findById(id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Cover image is required'
        });
      }

      // Delete old cover image if exists
      if (album.coverImage && fs.existsSync(album.coverImage)) {
        fs.unlinkSync(album.coverImage);
      }

      // Update album with new cover image
      album.coverImage = req.file.path;
      await album.save();

      res.json({
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: album.coverImage
        }
      });
    } catch (error) {
      console.error('Upload cover error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { AdminAlbumController: new AdminAlbumController(), upload };
