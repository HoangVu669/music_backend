/**
 * Admin Dashboard Controller
 */
const User = require('../../models/User');
const Song = require('../../models/Song');
const Playlist = require('../../models/Playlist');
const Artist = require('../../models/Artist');
const formatResponse = require('../../utils/formatResponse');

class AdminDashboardController {
  async getMetrics(req, res, next) {
    try {
      const totalUsers = await User.countDocuments();
      const totalSongs = await Song.countDocuments();
      const totalPlaylists = await Playlist.countDocuments();
      const totalArtists = await Artist.countDocuments();

      const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
      const newUsersToday = await User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      });

      res.json(
        formatResponse.success({
          metrics: {
            totalUsers,
            activeUsers,
            newUsersToday,
            totalSongs,
            totalPlaylists,
            totalArtists,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminDashboardController();

