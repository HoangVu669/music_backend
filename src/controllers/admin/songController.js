const Song = require('../../models/Song');
const { getSong } = require('../../services/zing/zingService');

async function listSongs(req, res, next) {
  try { const songs = await Song.find(); res.json({ success: true, data: songs }); } catch (e) { next(e); }
}
async function createSong(req, res, next) {
  try { const song = await Song.create(req.body); res.status(201).json({ success: true, data: song }); } catch (e) { next(e); }
}
async function getSongById(req, res, next) {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: song });
  } catch (e) { next(e); }
}
async function updateSongById(req, res, next) {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!song) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: song });
  } catch (e) { next(e); }
}
async function deleteSongById(req, res, next) {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
}
async function topLikedSongs(req, res, next) {
  try {
    const songs = await Song.find().sort({ likeCount: -1 }).limit(20);
    res.json({ success: true, data: songs });
  } catch (e) { next(e); }
}
async function syncSongFromZing(req, res, next) {
  try {
    const { zingId } = req.params;
    const data = await getSong(zingId);
    const upsert = await Song.findOneAndUpdate(
      { songId: zingId },
      {
        songId: zingId,
        title: data?.data?.title || data?.title || 'Unknown',
        artist: data?.data?.artistsNames || data?.artistsNames || '',
        duration: data?.data?.duration || data?.duration || 0,
      },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: upsert });
  } catch (e) { next(e); }
}

module.exports = {
  listSongs,
  createSong,
  getSongById,
  updateSongById,
  deleteSongById,
  topLikedSongs,
  syncSongFromZing,
};


