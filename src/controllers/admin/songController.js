const Song = require('../../models/Song');
const Artist = require('../../models/Artist');
const Album = require('../../models/Album');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/songs';
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /mp3|wav|flac|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

class AdminSongController {
  // GET /admin/songs
  async getSongs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        artist, 
        isApproved,
        isPublic,
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
      if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
      if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
      if (search) {
        filter.$text = { $search: search };
      }

      const songs = await Song.find(filter)
        .populate('artist', 'name avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await Song.countDocuments(filter);

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
      console.error('Get songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/songs/{id}
  async getSongById(req, res) {
    try {
      const { id } = req.params;

      const song = await Song.findById(id)
        .populate('artist', 'name avatar bio')
        .populate('album', 'title coverImage releaseDate');

      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      res.json({
        success: true,
        data: song
      });
    } catch (error) {
      console.error('Get song by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/songs
  async createSong(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        artist,
        album,
        genre,
        duration,
        lyrics,
        language,
        isExplicit,
        mood,
        bpm,
        key,
        tags
      } = req.body;

      // Check if artist exists
      const artistExists = await Artist.findById(artist);
      if (!artistExists) {
        return res.status(400).json({
          success: false,
          message: 'Artist not found'
        });
      }

      const song = new Song({
        title,
        artist,
        album,
        genre,
        duration: parseInt(duration),
        lyrics,
        language: language || 'vi',
        isExplicit: isExplicit === 'true',
        mood,
        bpm: bpm ? parseInt(bpm) : undefined,
        key,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: true,
        isApproved: true // Admin-created songs are auto-approved
      });

      await song.save();

      res.status(201).json({
        success: true,
        message: 'Song created successfully',
        data: song
      });
    } catch (error) {
      console.error('Create song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/songs/{id}
  async updateSong(req, res) {
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

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Update song
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          song[key] = updateData[key];
        }
      });

      await song.save();

      res.json({
        success: true,
        message: 'Song updated successfully',
        data: song
      });
    } catch (error) {
      console.error('Update song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /admin/songs/{id}
  async deleteSong(req, res) {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Delete audio file if exists
      if (song.fileUrl && fs.existsSync(song.fileUrl)) {
        fs.unlinkSync(song.fileUrl);
      }

      // Delete cover image if exists
      if (song.coverImage && fs.existsSync(song.coverImage)) {
        fs.unlinkSync(song.coverImage);
      }

      await Song.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Song deleted successfully'
      });
    } catch (error) {
      console.error('Delete song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/songs/{id}/upload
  async uploadAudio(req, res) {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
      }

      // Delete old audio file if exists
      if (song.fileUrl && fs.existsSync(song.fileUrl)) {
        fs.unlinkSync(song.fileUrl);
      }

      // Update song with new file info
      song.fileUrl = req.file.path;
      song.fileSize = req.file.size;
      song.format = path.extname(req.file.originalname).substring(1);

      // Set bitrate and sample rate based on file (simplified)
      if (song.format === 'mp3') {
        song.bitrate = 320; // Default high quality
        song.sampleRate = 44100;
      } else if (song.format === 'flac') {
        song.bitrate = 1411; // CD quality
        song.sampleRate = 44100;
      }

      await song.save();

      res.json({
        success: true,
        message: 'Audio file uploaded successfully',
        data: {
          fileUrl: song.fileUrl,
          fileSize: song.fileSize,
          format: song.format
        }
      });
    } catch (error) {
      console.error('Upload audio error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /admin/songs/{id}/cover
  async uploadCover(req, res) {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Cover image is required'
        });
      }

      // Delete old cover image if exists
      if (song.coverImage && fs.existsSync(song.coverImage)) {
        fs.unlinkSync(song.coverImage);
      }

      // Update song with new cover image
      song.coverImage = req.file.path;
      await song.save();

      res.json({
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: song.coverImage
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

  // PUT /admin/songs/{id}/approve
  async approveSong(req, res) {
    try {
      const { id } = req.params;

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      song.isApproved = true;
      await song.save();

      res.json({
        success: true,
        message: 'Song approved successfully'
      });
    } catch (error) {
      console.error('Approve song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /admin/songs/{id}/reject
  async rejectSong(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const song = await Song.findById(id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      song.isApproved = false;
      song.rejectionReason = reason;
      await song.save();

      res.json({
        success: true,
        message: 'Song rejected successfully'
      });
    } catch (error) {
      console.error('Reject song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { AdminSongController: new AdminSongController(), upload };
