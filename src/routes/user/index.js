const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Import new controllers
const songController = require('../../controllers/user/songController');
const roomController = require('../../controllers/user/roomController');
const socialController = require('../../controllers/user/socialController');
const playlistController = require('../../controllers/user/playlistController');
const homeController = require('../../controllers/user/homeController');
const discoveryController = require('../../controllers/user/discoveryController');

// Keep old controllers for backward compatibility (if needed)
const auth = require('../../controllers/user/authController');

const router = express.Router();

// ===== AUTHENTICATION =====
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/profile', authMiddleware(), auth.getProfile);
router.put('/auth/profile', authMiddleware(), auth.updateProfile);

// ===== HOME & DISCOVERY =====
router.get('/home', homeController.getHome);
router.get('/charts/top100', homeController.getTop100);
router.get('/charts/home', homeController.getChartHome);
router.get('/charts/new-release', homeController.getNewReleaseChart);

// ===== SONGS =====
// IMPORTANT: Đặt các route cụ thể TRƯỚC route có parameter để tránh conflict
// Search, popular, new-releases phải đứng trước /songs/:songId
router.get('/songs/search', songController.search);
router.get('/songs/popular', songController.getPopularSongs);
router.get('/songs/new-releases', songController.getNewReleases);
// Các route có parameter đặt sau
router.get('/songs/:songId', songController.getSong);
router.get('/songs/:songId/stream', songController.getStreamingUrl);
router.get('/songs/:songId/lyric', songController.getLyric);
router.post('/songs/:songId/play', authMiddleware(), songController.trackPlay);

// ===== DISCOVERY (Artist, Album, Playlist ZingMp3, MV, Suggest) =====
// Artist
router.get('/artists', discoveryController.getArtist);
router.get('/artists/:artistId/songs', discoveryController.getArtistSongs);

// Album (ZingMp3)
router.get('/albums/:albumId', discoveryController.getAlbum);

// ZingMp3 Playlist
router.get('/playlists/zing/:playlistId', discoveryController.getZingPlaylist);

// MV/Video
router.get('/mv', discoveryController.getListMV);
router.get('/mv/category', discoveryController.getCategoryMV);
router.get('/video/:videoId', discoveryController.getVideo);

// Search Suggest
router.get('/search/suggest', discoveryController.getSuggestKeyword);

// ===== ROOMS (Real-time Group Listening) =====
router.post('/rooms', authMiddleware(), roomController.createRoom);
// Route cụ thể phải đứng trước route có parameter
router.get('/rooms/public', roomController.getPublicRooms);
router.get('/rooms/my-rooms', authMiddleware(), roomController.getMyRooms);
// Route có parameter đặt sau
router.get('/rooms/:roomId', roomController.getRoom);
router.post('/rooms/:roomId/join', authMiddleware(), roomController.joinRoom);
router.post('/rooms/:roomId/leave', authMiddleware(), roomController.leaveRoom);
router.put('/rooms/:roomId/playback', authMiddleware(), roomController.updatePlayback);
router.post('/rooms/:roomId/queue', authMiddleware(), roomController.addSongToQueue);
router.delete('/rooms/:roomId/queue/:songId', authMiddleware(), roomController.removeSongFromQueue);

// ===== SOCIAL FEATURES =====
// Comments
router.post('/songs/:songId/comments', authMiddleware(), socialController.commentSong);
router.get('/songs/:songId/comments', socialController.getSongComments);
router.post('/comments/:commentId/reply', authMiddleware(), socialController.replyComment);
router.post('/comments/:commentId/like', authMiddleware(), socialController.likeComment);

// Likes
router.post('/songs/:songId/like', authMiddleware(), socialController.likeSong);
router.post('/albums/:albumId/like', authMiddleware(), socialController.likeAlbum);
router.get('/likes', authMiddleware(), socialController.checkLikes);
router.get('/likes/songs', authMiddleware(), socialController.getLikedSongs);

// Follow
router.post('/users/:userId/follow', authMiddleware(), socialController.followUser);
router.post('/artists/:artistId/follow', authMiddleware(), socialController.followArtist);
router.get('/follows/artists', authMiddleware(), socialController.getFollowedArtists);

// Share
router.post('/songs/:songId/share', authMiddleware(), socialController.shareSong);

// Notifications
router.get('/notifications', authMiddleware(), socialController.getNotifications);
// Route cụ thể phải đứng trước route có parameter
router.put('/notifications/read-all', authMiddleware(), socialController.markAllNotificationsAsRead);
router.get('/notifications/unread-count', authMiddleware(), socialController.getUnreadCount);
// Route có parameter đặt sau
router.put('/notifications/:notificationId/read', authMiddleware(), socialController.markNotificationAsRead);

// ===== PLAYLISTS =====
router.post('/playlists', authMiddleware(), playlistController.createPlaylist);
router.get('/playlists', authMiddleware(), playlistController.getMyPlaylists);
// Route cụ thể phải đứng trước route có parameter
router.get('/playlists/public', playlistController.getPublicPlaylists);
router.get('/playlists/followed', authMiddleware(), playlistController.getFollowedPlaylists);
// Route có parameter đặt sau
router.get('/playlists/:playlistId', playlistController.getPlaylist);
router.put('/playlists/:playlistId', authMiddleware(), playlistController.updatePlaylist);
router.delete('/playlists/:playlistId', authMiddleware(), playlistController.deletePlaylist);
router.post('/playlists/:playlistId/songs', authMiddleware(), playlistController.addSong);
router.delete('/playlists/:playlistId/songs/:songId', authMiddleware(), playlistController.removeSong);
router.put('/playlists/:playlistId/reorder', authMiddleware(), playlistController.reorderSongs);
router.post('/playlists/:playlistId/like', authMiddleware(), playlistController.likePlaylist);
router.post('/playlists/:playlistId/follow', authMiddleware(), playlistController.followPlaylist);

module.exports = router;


