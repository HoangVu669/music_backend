const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');

const auth = require('../../controllers/user/authController');
const music = require('../../controllers/user/musicController');
const playlist = require('../../controllers/user/playlistController');
const artist = require('../../controllers/user/artistController');
const social = require('../../controllers/user/socialController');
const group = require('../../controllers/user/groupController');

const router = express.Router();

// ===== AUTHENTICATION =====
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.put('/auth/profile', authMiddleware(), auth.updateProfile);

// ===== MUSIC & DISCOVERY =====
// Home & Charts
router.get('/home', music.getHome);
router.get('/charts/top100', music.getTop100Songs);
router.get('/charts/home', music.getChartHomeData);
router.get('/charts/new-release', music.getNewReleaseChartData);

// Song Details
router.get('/songs/liked', authMiddleware(), music.getUserLikedSongs);
router.get('/songs/:songId', music.getSongInfoOnly);
router.get('/songs/:songId/lyric', music.getSongLyricOnly);
router.get('/songs/:songId/stream', music.getStreamingUrl);
router.post('/songs/:songId/like', authMiddleware(), music.likeSong);
router.delete('/songs/:songId/like', authMiddleware(), music.unlikeSong);

// Search
router.get('/search', music.searchMusic);

// ===== PLAYLISTS =====
router.post('/playlists', authMiddleware(), playlist.createPlaylist);
router.get('/playlists', authMiddleware(), playlist.getUserPlaylists);
router.get('/playlists/public', playlist.getPublicPlaylists);
router.get('/playlists/:playlistId', authMiddleware(), playlist.getPlaylistDetails);
router.put('/playlists/:playlistId', authMiddleware(), playlist.updatePlaylist);
router.delete('/playlists/:playlistId', authMiddleware(), playlist.deletePlaylist);
router.post('/playlists/:playlistId/songs', authMiddleware(), playlist.addSongToPlaylist);
router.delete('/playlists/:playlistId/songs/:songId', authMiddleware(), playlist.removeSongFromPlaylist);

// ===== ARTISTS =====
router.get('/artists/:artistId', artist.getArtistDetails);
router.get('/artists/:artistId/songs', artist.getArtistSongs);
router.get('/artists/:artistId/playlists', artist.getArtistPlaylists);
router.post('/artists/:artistId/follow', authMiddleware(), artist.followArtist);
router.get('/artists/followed', authMiddleware(), artist.getFollowedArtists); 
router.get('/artists/popular', artist.getPopularArtists);

// ===== SOCIAL FEATURES =====
// Comments
router.post('/songs/:songId/comments', authMiddleware(), social.commentOnSong);
router.get('/songs/:songId/comments', social.getSongComments);
router.put('/comments/:commentId', authMiddleware(), social.updateComment);
router.delete('/comments/:commentId', authMiddleware(), social.deleteComment);
router.post('/comments/:commentId/like', authMiddleware(), social.likeComment);

// User Activity
router.get('/comments/my', authMiddleware(), social.getUserComments);
router.post('/songs/:songId/share', authMiddleware(), social.shareSong);
router.get('/activity', authMiddleware(), social.getUserActivity);

// ===== GROUP LISTENING (Real-time) =====
router.post('/groups', authMiddleware(), group.createGroup);
router.get('/groups/public', group.getPublicGroups);
router.get('/groups/my', authMiddleware(), group.getUserGroups);
router.get('/groups/:groupId', authMiddleware(), group.getGroupDetails);
router.post('/groups/:groupId/join', authMiddleware(), group.joinGroup);
router.post('/groups/:groupId/leave', authMiddleware(), group.leaveGroup);
router.put('/groups/:groupId/settings', authMiddleware(), group.updateGroupSettings);
router.delete('/groups/:groupId', authMiddleware(), group.deleteGroup);
router.post('/groups/:groupId/queue', authMiddleware(), group.addSongToQueue);
router.delete('/groups/:groupId/queue/:songIndex', authMiddleware(), group.removeSongFromQueue);
router.get('/groups/:groupId/queue', authMiddleware(), group.getGroupQueue);

module.exports = router;


