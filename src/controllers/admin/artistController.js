const Artist = require('../../models/Artist');
const { getListArtistSong, getListArtistPlaylist } = require('../../services/zing/zingService');

async function listArtists(req, res, next) {
  try { const items = await Artist.find(); res.json({ success: true, data: items }); } catch (e) { next(e); }
}
async function createArtist(req, res, next) {
  try { const item = await Artist.create(req.body); res.status(201).json({ success: true, data: item }); } catch (e) { next(e); }
}
async function getArtistById(req, res, next) {
  try { const item = await Artist.findById(req.params.id); if (!item) return res.status(404).json({ success:false, message:'Not found'}); res.json({ success:true, data:item}); } catch (e) { next(e); }
}
async function updateArtistById(req, res, next) {
  try { const item = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!item) return res.status(404).json({ success:false, message:'Not found'}); res.json({ success:true, data:item}); } catch (e) { next(e); }
}
async function deleteArtistById(req, res, next) {
  try { const item = await Artist.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ success:false, message:'Not found'}); res.json({ success:true, message:'Deleted'}); } catch (e) { next(e); }
}
async function syncArtistSongs(req, res, next) {
  try {
    const { artistId } = req.params;
    const data = await getListArtistSong(artistId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
async function syncArtistPlaylists(req, res, next) {
  try {
    const { artistId } = req.params;
    const data = await getListArtistPlaylist(artistId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = {
  listArtists,
  createArtist,
  getArtistById,
  updateArtistById,
  deleteArtistById,
  syncArtistSongs,
  syncArtistPlaylists,
};


