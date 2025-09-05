const Playlist = require('../../models/Playlist');

async function listPlaylists(req, res, next) {
  try { const items = await Playlist.find(); res.json({ success: true, data: items }); } catch (e) { next(e); }
}
async function getPlaylistById(req, res, next) {
  try {
    const item = await Playlist.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
}
async function updatePlaylistById(req, res, next) {
  try {
    const item = await Playlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
}
async function deletePlaylistById(req, res, next) {
  try {
    const item = await Playlist.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
}

module.exports = { listPlaylists, getPlaylistById, updatePlaylistById, deletePlaylistById };


