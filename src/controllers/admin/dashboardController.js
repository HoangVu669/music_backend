const User = require('../../models/User');
const Playlist = require('../../models/Playlist');
const Artist = require('../../models/Artist');

async function getMetrics(req, res, next) {
  try {
    const [users, playlists, likesAgg, followsAgg] = await Promise.all([
      User.countDocuments(),
      Playlist.countDocuments(),
      User.aggregate([{ $unwind: '$likedSongs' }, { $count: 'totalLikes' }]),
      User.aggregate([{ $unwind: '$followedArtists' }, { $count: 'totalFollows' }]),
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: users,
        totalPlaylists: playlists,
        totalLikes: likesAgg[0]?.totalLikes || 0,
        totalFollows: followsAgg[0]?.totalFollows || 0,
      },
    });
  } catch (e) { next(e); }
}

module.exports = { getMetrics };


