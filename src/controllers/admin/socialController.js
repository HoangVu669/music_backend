/**
 * Admin Social Controller
 */
const SongComment = require('../../models/SongComment');
const SongLike = require('../../models/SongLike');
const UserFollow = require('../../models/UserFollow');
const formatResponse = require('../../utils/formatResponse');

class AdminSocialController {
  async getSocialStats(req, res, next) {
    try {
      const totalComments = await SongComment.countDocuments();
      const totalLikes = await SongLike.countDocuments();
      const totalFollows = await UserFollow.countDocuments();

      res.json(
        formatResponse.success({
          stats: {
            totalComments,
            totalLikes,
            totalFollows,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminSocialController();

