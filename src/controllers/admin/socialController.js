const User = require('../../models/User');
const Comment = require('../../models/Comment');

async function getSocialStats(req, res, next) {
  try {
    const [likesAgg, followsAgg, commentsCount] = await Promise.all([
      User.aggregate([{ $unwind: '$likedSongs' }, { $count: 'totalLikes' }]),
      User.aggregate([{ $unwind: '$followedArtists' }, { $count: 'totalFollows' }]),
      Comment.countDocuments(),
    ]);
    res.json({
      success: true,
      data: {
        totalLikes: likesAgg[0]?.totalLikes || 0,
        totalFollows: followsAgg[0]?.totalFollows || 0,
        totalComments: commentsCount,
      },
    });
  } catch (e) { next(e); }
}

module.exports = { getSocialStats };


