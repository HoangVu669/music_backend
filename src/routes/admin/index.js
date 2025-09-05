const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');

const auth = require('../../controllers/admin/authController');
const user = require('../../controllers/admin/userController');
const song = require('../../controllers/admin/songController');
const playlist = require('../../controllers/admin/playlistController');
const artist = require('../../controllers/admin/artistController');
const social = require('../../controllers/admin/socialController');
const dashboard = require('../../controllers/admin/dashboardController');

const router = express.Router();

// Auth
router.post('/auth/login', auth.login);

// Protect all admin routes
router.use(authMiddleware('admin'));

// Users
router.get('/users', user.listUsers);
router.post('/users', user.createUser);
router.get('/users/:id', user.getUserById);
router.put('/users/:id', user.updateUserById);
router.delete('/users/:id', user.deleteUserById);
router.post('/users/:id/lock', user.lockUser);
router.post('/users/:id/unlock', user.unlockUser);
router.post('/users/:id/reset-password', user.resetPassword);

// Songs
router.get('/songs', song.listSongs);
router.post('/songs', song.createSong);
router.get('/songs/top-liked', song.topLikedSongs);
router.get('/songs/:id', song.getSongById);
router.put('/songs/:id', song.updateSongById);
router.delete('/songs/:id', song.deleteSongById);
router.post('/songs/sync/:zingId', song.syncSongFromZing);

// Playlists
router.get('/playlists', playlist.listPlaylists);
router.get('/playlists/:id', playlist.getPlaylistById);
router.put('/playlists/:id', playlist.updatePlaylistById);
router.delete('/playlists/:id', playlist.deletePlaylistById);

// Artists
router.get('/artists', artist.listArtists);
router.post('/artists', artist.createArtist);
router.get('/artists/:id', artist.getArtistById);
router.put('/artists/:id', artist.updateArtistById);
router.delete('/artists/:id', artist.deleteArtistById);
router.post('/artists/:artistId/sync/songs', artist.syncArtistSongs);
router.post('/artists/:artistId/sync/playlists', artist.syncArtistPlaylists);

// Social
router.get('/social/stats', social.getSocialStats);

// Dashboard
router.get('/dashboard/metrics', dashboard.getMetrics);

module.exports = router;


