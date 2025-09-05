const Playlist = require('../../models/Playlist');
const Song = require('../../models/Song');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

class UserPlaylistController {
  // GET /playlists
  async getPlaylists(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        owner, 
        genre, 
        mood,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = { isPublic: true };
      
      if (owner) filter.owner = owner;
      if (genre) filter.genre = genre;
      if (mood) filter.mood = mood;
      if (search) {
        filter.$text = { $search: search };
      }

      const playlists = await Playlist.find(filter)
        .populate('owner', 'fullName avatar')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await Playlist.countDocuments(filter);

      res.json({
        success: true,
        data: {
          playlists,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /playlists/my
  async getMyPlaylists(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const playlists = await Playlist.find({ owner: userId })
        .populate('songs.song', 'title duration coverImage artist')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Playlist.countDocuments({ owner: userId });

      res.json({
        success: true,
        data: {
          playlists,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get my playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /playlists/{id}
  async getPlaylistById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const playlist = await Playlist.findById(id)
        .populate('owner', 'fullName avatar')
        .populate('songs.song', 'title duration coverImage artist')
        .populate('songs.addedBy', 'fullName avatar');

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check if user can view this playlist
      if (!playlist.isPublic && playlist.owner._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: playlist
      });
    } catch (error) {
      console.error('Get playlist by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /playlists
  async createPlaylist(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, description, coverImage, isPublic, genre, mood, tags } = req.body;
      const userId = req.user.userId;

      const playlist = new Playlist({
        name,
        description,
        owner: userId,
        coverImage,
        isPublic: isPublic !== undefined ? isPublic : true,
        genre,
        mood,
        tags
      });

      await playlist.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalPlaylists': 1 }
      });

      res.status(201).json({
        success: true,
        message: 'Playlist created successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Create playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // PUT /playlists/{id}
  async updatePlaylist(req, res) {
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
      const userId = req.user.userId;
      const { name, description, coverImage, isPublic, genre, mood, tags } = req.body;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check ownership
      if (playlist.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update fields
      if (name) playlist.name = name;
      if (description !== undefined) playlist.description = description;
      if (coverImage !== undefined) playlist.coverImage = coverImage;
      if (isPublic !== undefined) playlist.isPublic = isPublic;
      if (genre) playlist.genre = genre;
      if (mood) playlist.mood = mood;
      if (tags) playlist.tags = tags;

      await playlist.save();

      res.json({
        success: true,
        message: 'Playlist updated successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Update playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /playlists/{id}
  async deletePlaylist(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check ownership
      if (playlist.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await Playlist.findByIdAndDelete(id);

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalPlaylists': -1 }
      });

      res.json({
        success: true,
        message: 'Playlist deleted successfully'
      });
    } catch (error) {
      console.error('Delete playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /playlists/{id}/songs
  async addSongToPlaylist(req, res) {
    try {
      const { id } = req.params;
      const { songId } = req.body;
      const userId = req.user.userId;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check ownership or collaboration rights
      const isOwner = playlist.owner.toString() === userId;
      const isCollaborator = playlist.collaborators.some(
        collab => collab.user.toString() === userId && collab.role === 'editor'
      );

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if song exists
      const song = await Song.findById(songId);
      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Add song to playlist
      await playlist.addSong(songId, userId);

      res.json({
        success: true,
        message: 'Song added to playlist successfully'
      });
    } catch (error) {
      console.error('Add song to playlist error:', error);
      if (error.message === 'Song already exists in playlist') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // DELETE /playlists/{id}/songs/{songId}
  async removeSongFromPlaylist(req, res) {
    try {
      const { id, songId } = req.params;
      const userId = req.user.userId;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check ownership or collaboration rights
      const isOwner = playlist.owner.toString() === userId;
      const isCollaborator = playlist.collaborators.some(
        collab => collab.user.toString() === userId && collab.role === 'editor'
      );

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Remove song from playlist
      await playlist.removeSong(songId);

      res.json({
        success: true,
        message: 'Song removed from playlist successfully'
      });
    } catch (error) {
      console.error('Remove song from playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /playlists/{id}/share
  async sharePlaylist(req, res) {
    try {
      const { id } = req.params;
      const { isPublic } = req.body;
      const userId = req.user.userId;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Check ownership
      if (playlist.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      playlist.isPublic = isPublic;
      await playlist.save();

      res.json({
        success: true,
        message: `Playlist ${isPublic ? 'shared publicly' : 'made private'} successfully`,
        data: playlist
      });
    } catch (error) {
      console.error('Share playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserPlaylistController();
