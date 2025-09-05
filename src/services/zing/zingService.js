const { ZingMp3 } = require('zingmp3-api-full-v3');

async function getSong(id) {
  return ZingMp3.getSong(id);
}

async function getLyric(id) {
  return ZingMp3.getLyric(id);
}

async function getArtist(name) {
  return ZingMp3.getArtist(name);
}

async function search(query) {
  return ZingMp3.search(query);
}

async function getListArtistSong(artistId) {
  return ZingMp3.getListArtistSong(artistId);
}

async function getListArtistPlaylist(artistId) {
  return ZingMp3.getListArtistPlaylist(artistId);
}

module.exports = {
  getSong,
  getLyric,
  getArtist,
  search,
  getListArtistSong,
  getListArtistPlaylist,
};


