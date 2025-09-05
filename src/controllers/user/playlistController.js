const Playlist = require('../../models/Playlist');

async function createPlaylist(req, res, next) {
  try {
    const { name } = req.body;
    const playlist = await Playlist.create({ name, userId: req.user.id, songs: [] });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
}

async function listMyPlaylists(req, res, next) {
  try {
    const playlists = await Playlist.find({ userId: req.user.id });
    res.json({ success: true, data: playlists });
  } catch (err) {
    next(err);
  }
}

async function getPlaylistById(req, res, next) {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.playlistId, userId: req.user.id });
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
}

async function updatePlaylistById(req, res, next) {
  try {
    const { name } = req.body;
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.playlistId, userId: req.user.id },
      { name },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
}

async function deletePlaylistById(req, res, next) {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.playlistId, userId: req.user.id });
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

async function addSongToPlaylist(req, res, next) {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.playlistId, userId: req.user.id },
      { $addToSet: { songs: songId } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPlaylist,
  listMyPlaylists,
  getPlaylistById,
  updatePlaylistById,
  deletePlaylistById,
  addSongToPlaylist,
};


