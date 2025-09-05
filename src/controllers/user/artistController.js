const User = require('../../models/User');
const Artist = require('../../models/Artist');
const { getArtist } = require('../../services/zing/zingService');

async function followArtist(req, res, next) {
  try {
    const { artistId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { followedArtists: artistId } });
    res.json({ success: true, message: 'Followed' });
  } catch (err) {
    next(err);
  }
}

async function unfollowArtist(req, res, next) {
  try {
    const { artistId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $pull: { followedArtists: artistId } });
    res.json({ success: true, message: 'Unfollowed' });
  } catch (err) {
    next(err);
  }
}

async function getArtistInfo(req, res, next) {
  try {
    const { name } = req.params;
    const data = await getArtist(name);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { followArtist, unfollowArtist, getArtistInfo };


