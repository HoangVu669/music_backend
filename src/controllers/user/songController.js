const User = require('../../models/User');
const { getSong, getLyric } = require('../../services/zing/zingService');

async function getSongById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await getSong(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getLyricBySongId(req, res, next) {
  try {
    const { id } = req.params;
    const data = await getLyric(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function likeSong(req, res, next) {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { likedSongs: id } },
      { new: true }
    );
    res.json({ success: true, message: 'Liked' });
  } catch (err) {
    next(err);
  }
}

async function unlikeSong(req, res, next) {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $pull: { likedSongs: id } }, { new: true });
    res.json({ success: true, message: 'Unliked' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSongById, getLyricBySongId, likeSong, unlikeSong };


