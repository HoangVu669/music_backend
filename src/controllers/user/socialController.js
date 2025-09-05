const Comment = require('../../models/Comment');
const User = require('../../models/User');

async function commentSong(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const comment = await Comment.create({ userId: req.user.id, songId: id, content });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function sharePlaylist(req, res, next) {
  try {
    const { playlistId } = req.params;
    // For demo: return a shareable link format
    res.json({ success: true, data: { url: `/playlists/${playlistId}` } });
  } catch (err) {
    next(err);
  }
}

async function getLikedSongs(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('likedSongs');
    res.json({ success: true, data: user?.likedSongs || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = { commentSong, sharePlaylist, getLikedSongs };


