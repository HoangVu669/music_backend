const Song = require('../../models/Song');
const Artist = require('../../models/Artist');
const Album = require('../../models/Album');
const Playlist = require('../../models/Playlist');
const User = require('../../models/User');
const PlayHistory = require('../../models/PlayHistory');
const Like = require('../../models/Like');
const Follow = require('../../models/Follow');

class AdminReportController {
  // GET /admin/reports
  async getReports(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get basic stats
      const [
        totalUsers,
        totalSongs,
        totalArtists,
        totalAlbums,
        totalPlaylists,
        totalPlayHistory,
        totalLikes,
        totalFollows
      ] = await Promise.all([
        User.countDocuments({ role: 'user', isActive: true }),
        Song.countDocuments({ isPublic: true, isApproved: true }),
        Artist.countDocuments({ isActive: true }),
        Album.countDocuments({ isActive: true }),
        Playlist.countDocuments({ isPublic: true }),
        PlayHistory.countDocuments({ playedAt: { $gte: startDate } }),
        Like.countDocuments({ likedAt: { $gte: startDate } }),
        Follow.countDocuments({ followedAt: { $gte: startDate } })
      ]);

      // Get top songs by play count
      const topSongs = await Song.find({ isPublic: true, isApproved: true })
        .populate('artist', 'name')
        .sort({ 'stats.playCount': -1 })
        .limit(10)
        .select('title artist stats.playCount stats.likeCount');

      // Get top artists by follower count
      const topArtists = await Artist.find({ isActive: true })
        .sort({ totalFollowers: -1 })
        .limit(10)
        .select('name totalFollowers avatar');

      // Get top playlists by play count
      const topPlaylists = await Playlist.find({ isPublic: true })
        .populate('owner', 'fullName')
        .sort({ 'stats.playCount': -1 })
        .limit(10)
        .select('name owner stats.playCount stats.likeCount');

      // Get genre distribution
      const genreStats = await Song.aggregate([
        { $match: { isPublic: true, isApproved: true } },
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get user growth over time
      const userGrowth = await User.aggregate([
        { $match: { role: 'user', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Get play count over time
      const playCountOverTime = await PlayHistory.aggregate([
        { $match: { playedAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$playedAt' },
              month: { $month: '$playedAt' },
              day: { $dayOfMonth: '$playedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          overview: {
            totalUsers,
            totalSongs,
            totalArtists,
            totalAlbums,
            totalPlaylists,
            totalPlays: totalPlayHistory,
            totalLikes,
            totalFollows
          },
          topSongs,
          topArtists,
          topPlaylists,
          genreStats,
          userGrowth,
          playCountOverTime
        }
      });
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/reports/users
  async getUserReports(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get user statistics
      const [
        activeUsers,
        newUsers,
        bannedUsers,
        topUsersByPlayTime,
        topUsersByPlaylists
      ] = await Promise.all([
        User.countDocuments({ 
          role: 'user', 
          isActive: true, 
          lastLogin: { $gte: startDate } 
        }),
        User.countDocuments({ 
          role: 'user', 
          createdAt: { $gte: startDate } 
        }),
        User.countDocuments({ 
          role: 'user', 
          isActive: false, 
          blockedAt: { $gte: startDate } 
        }),
        User.find({ role: 'user', isActive: true })
          .sort({ 'stats.totalPlayTime': -1 })
          .limit(10)
          .select('fullName avatar stats.totalPlayTime stats.totalSongsPlayed'),
        User.find({ role: 'user', isActive: true })
          .sort({ 'stats.totalPlaylists': -1 })
          .limit(10)
          .select('fullName avatar stats.totalPlaylists')
      ]);

      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          stats: {
            activeUsers,
            newUsers,
            bannedUsers
          },
          topUsersByPlayTime,
          topUsersByPlaylists
        }
      });
    } catch (error) {
      console.error('Get user reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /admin/reports/content
  async getContentReports(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get content statistics
      const [
        newSongs,
        newArtists,
        newAlbums,
        newPlaylists,
        pendingSongs,
        totalPlayCount,
        totalLikeCount
      ] = await Promise.all([
        Song.countDocuments({ 
          isPublic: true, 
          isApproved: true, 
          createdAt: { $gte: startDate } 
        }),
        Artist.countDocuments({ 
          isActive: true, 
          createdAt: { $gte: startDate } 
        }),
        Album.countDocuments({ 
          isActive: true, 
          createdAt: { $gte: startDate } 
        }),
        Playlist.countDocuments({ 
          isPublic: true, 
          createdAt: { $gte: startDate } 
        }),
        Song.countDocuments({ isApproved: false }),
        Song.aggregate([
          { $match: { isPublic: true, isApproved: true } },
          { $group: { _id: null, total: { $sum: '$stats.playCount' } } }
        ]),
        Song.aggregate([
          { $match: { isPublic: true, isApproved: true } },
          { $group: { _id: null, total: { $sum: '$stats.likeCount' } } }
        ])
      ]);

      res.json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          stats: {
            newSongs,
            newArtists,
            newAlbums,
            newPlaylists,
            pendingSongs,
            totalPlayCount: totalPlayCount[0]?.total || 0,
            totalLikeCount: totalLikeCount[0]?.total || 0
          }
        }
      });
    } catch (error) {
      console.error('Get content reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AdminReportController();
