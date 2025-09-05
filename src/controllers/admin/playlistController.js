const Playlist = require('../../models/Playlist');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

class AdminPlaylistController {
  // GET /admin/playlists
  async getPlaylists(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        owner, 
        genre, 
        mood,
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
      
      if (owner) filter.owner = owner;
      if (genre) filter.genre = genre;
      if (mood) filter.mood = mood;
      if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
      if (search) {
        filter.$text = { $search: search };
      }

      const playlists = await Playlist.find(filter)
        .populate('owner', 'fullName avatar email')
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

  // GET /admin/playlists/{id}
  async getPlaylistById(req, res) {
    try {
      const { id } = req.params;

      const playlist = await Playlist.findById(id)
        .populate('owner', 'fullName avatar email')
        .populate('songs.song', 'title duration coverImage artist')
        .populate('songs.addedBy', 'fullName avatar');

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
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

  // DELETE /admin/playlists/{id}
  async deletePlaylist(req, res) {
    try {
      const { id } = req.params;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      await Playlist.findByIdAndDelete(id);

      // Update user stats
      await User.findByIdAndUpdate(playlist.owner, {
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

  // PUT /admin/playlists/{id}/feature
  async featurePlaylist(req, res) {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body;

      const playlist = await Playlist.findById(id);
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      playlist.featured.isFeatured = isFeatured;
      if (isFeatured) {
        playlist.featured.featuredAt = new Date();
        playlist.featured.featuredBy = req.user.userId;
      } else {
        playlist.featured.featuredAt = null;
        playlist.featured.featuredBy = null;
      }

      await playlist.save();

      res.json({
        success: true,
        message: `Playlist ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
        data: playlist.featured
      });
    } catch (error) {
      console.error('Feature playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AdminPlaylistController();
