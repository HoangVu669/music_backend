const Song = require('../../models/Song');
const User = require('../../models/User');
const Like = require('../../models/Like');
const Comment = require('../../models/Comment');
const PlayHistory = require('../../models/PlayHistory');
const { ZingMp3 } = require('zingmp3-api-full-v3');
const { validationResult } = require('express-validator');

class UserSongController {
  // GET /songs
  async getSongs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        genre, 
        artist, 
        album, 
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = { isPublic: true, isApproved: true };
      
      if (genre) filter.genre = genre;
      if (artist) filter.artist = artist;
      if (album) filter.album = album;
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

  // GET /songs/{id}
  async getSongById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const song = await Song.findById(id)
        .populate('artist', 'name avatar bio')
        .populate('album', 'title coverImage releaseDate');

      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Check if user liked this song
      let isLiked = false;
      if (userId) {
        const like = await Like.findOne({ user: userId, song: id });
        isLiked = !!like;
      }

      res.json({
        success: true,
        data: {
          ...song.toObject(),
          isLiked
        }
      });
    } catch (error) {
      console.error('Get song by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /songs/{id}/stream
  async streamSong(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const song = await Song.findById(id);
      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Record play history
      if (userId) {
        const playHistory = new PlayHistory({
          user: userId,
          song: id,
          playedAt: new Date()
        });
        await playHistory.save();

        // Update song play count
        await song.incrementPlayCount();

        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { 
            'stats.totalPlayTime': song.duration,
            'stats.totalSongsPlayed': 1
          }
        });
      }

      // Return streaming URL or file info
      res.json({
        success: true,
        data: {
          streamUrl: song.fileUrl,
          duration: song.duration,
          format: song.format,
          bitrate: song.bitrate
        }
      });
    } catch (error) {
      console.error('Stream song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /songs/{id}/like
  async likeSong(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const song = await Song.findById(id);
      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Check if already liked
      const existingLike = await Like.findOne({ user: userId, song: id });
      if (existingLike) {
        return res.status(400).json({
          success: false,
          message: 'Song already liked'
        });
      }

      // Create like
      const like = new Like({ user: userId, song: id });
      await like.save();

      // Update song like count
      await song.incrementLikeCount();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalLikes': 1 }
      });

      res.status(201).json({
        success: true,
        message: 'Song liked successfully'
      });
    } catch (error) {
      console.error('Like song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /songs/{id}/like
  async unlikeSong(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const like = await Like.findOne({ user: userId, song: id });
      if (!like) {
        return res.status(400).json({
          success: false,
          message: 'Song not liked'
        });
      }

      // Remove like
      await Like.findByIdAndDelete(like._id);

      // Update song like count
      const song = await Song.findById(id);
      if (song) {
        song.stats.likeCount = Math.max(0, song.stats.likeCount - 1);
        await song.save();
      }

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalLikes': -1 }
      });

      res.json({
        success: true,
        message: 'Song unliked successfully'
      });
    } catch (error) {
      console.error('Unlike song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /songs/{id}/likes
  async getSongLikes(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const likes = await Like.find({ song: id })
        .populate('user', 'fullName avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ likedAt: -1 });

      const total = await Like.countDocuments({ song: id });

      res.json({
        success: true,
        data: {
          likes: likes.map(like => like.user),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get song likes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /songs/{id}/comment
  async addComment(req, res) {
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
      const { content, parentComment, timestamp } = req.body;
      const userId = req.user.userId;

      const song = await Song.findById(id);
      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      const comment = new Comment({
        content,
        user: userId,
        song: id,
        parentComment,
        timestamp
      });

      await comment.save();

      // Populate user info
      await comment.populate('user', 'fullName avatar');

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /songs/{id}/comments
  async getSongComments(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const comments = await Comment.find({ 
        song: id, 
        isDeleted: false,
        parentComment: null // Only top-level comments
      })
      .populate('user', 'fullName avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'fullName avatar'
        }
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

      const total = await Comment.countDocuments({ 
        song: id, 
        isDeleted: false,
        parentComment: null 
      });

      res.json({
        success: true,
        data: {
          comments,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get song comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /songs/zing/{id} - Get song from ZingMp3
  async getZingSong(req, res) {
    try {
      const { id } = req.params;
      
      const data = await ZingMp3.getSong(id);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Get Zing song error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get song from ZingMp3'
      });
    }
  }

  // GET /songs/zing/search - Search songs from ZingMp3
  async searchZingSongs(req, res) {
    try {
      const { keyword } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: 'Search keyword is required'
        });
      }

      const data = await ZingMp3.search(keyword);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Search Zing songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search songs from ZingMp3'
      });
    }
  }
}

module.exports = new UserSongController();
