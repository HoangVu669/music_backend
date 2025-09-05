const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');

const auth = require('../../controllers/user/authController');
const song = require('../../controllers/user/songController');
const playlist = require('../../controllers/user/playlistController');
const artist = require('../../controllers/user/artistController');
const social = require('../../controllers/user/socialController');

const router = express.Router();

// Auth
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.put('/auth/profile', authMiddleware(), auth.updateProfile);

// Songs
router.get('/songs/:id', song.getSongById);
router.get('/songs/:id/lyric', song.getLyricBySongId);
router.post('/songs/:id/like', authMiddleware(), song.likeSong);
router.delete('/songs/:id/like', authMiddleware(), song.unlikeSong);

// Playlists
router.post('/playlists', authMiddleware(), playlist.createPlaylist);
router.get('/playlists', authMiddleware(), playlist.listMyPlaylists);
router.get('/playlists/:playlistId', authMiddleware(), playlist.getPlaylistById);
router.put('/playlists/:playlistId', authMiddleware(), playlist.updatePlaylistById);
router.delete('/playlists/:playlistId', authMiddleware(), playlist.deletePlaylistById);
router.post('/playlists/:playlistId/songs', authMiddleware(), playlist.addSongToPlaylist);

// Artists
router.post('/artists/:artistId/follow', authMiddleware(), artist.followArtist);
router.delete('/artists/:artistId/follow', authMiddleware(), artist.unfollowArtist);
router.get('/artists/info/:name', artist.getArtistInfo);

// Social
router.post('/songs/:id/comments', authMiddleware(), social.commentSong);
router.get('/me/likes', authMiddleware(), social.getLikedSongs);
router.post('/playlists/:playlistId/share', authMiddleware(), social.sharePlaylist);

module.exports = router;


