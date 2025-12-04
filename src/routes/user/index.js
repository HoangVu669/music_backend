const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Import new controllers
const songController = require('../../controllers/user/songController');
const roomController = require('../../controllers/user/roomController');
const socialController = require('../../controllers/user/socialController');
const playlistController = require('../../controllers/user/playlistController');
const homeController = require('../../controllers/user/homeController');
const discoveryController = require('../../controllers/user/discoveryController');
const djRotationController = require('../../controllers/user/djRotationController');
const voteSkipController = require('../../controllers/user/voteSkipController');

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
router.get('/rooms/invitations', authMiddleware(), roomController.getMyInvitations);
// Route có parameter đặt sau
router.get('/rooms/:roomId', authMiddleware(), roomController.getRoom);
router.post('/rooms/:roomId/join', authMiddleware(), roomController.joinRoom);
router.post('/rooms/:roomId/leave', authMiddleware(), roomController.leaveRoom);
router.get('/rooms/:roomId/queue', authMiddleware(), roomController.getQueue);
router.post('/rooms/:roomId/queue', authMiddleware(), roomController.addSongToQueue);
router.delete('/rooms/:roomId/queue/:songId', authMiddleware(), roomController.removeSongFromQueue);
router.put('/rooms/:roomId/playback', authMiddleware(), roomController.updatePlayback);
router.post('/rooms/:roomId/play/:songId', authMiddleware(), roomController.playSong);
router.post('/rooms/:roomId/play-next', authMiddleware(), roomController.playNext);
// Room management (chỉ chủ phòng)
router.get('/rooms/:roomId/requests', authMiddleware(), roomController.getPendingRequests);
router.post('/rooms/:roomId/requests/:userId/accept', authMiddleware(), roomController.acceptJoinRequest);
router.post('/rooms/:roomId/requests/:userId/reject', authMiddleware(), roomController.rejectJoinRequest);
router.post('/rooms/:roomId/invite', authMiddleware(), roomController.inviteUser);
// Invitations
router.post('/rooms/invitations/:invitationId/accept', authMiddleware(), roomController.acceptInvitation);
router.post('/rooms/invitations/:invitationId/reject', authMiddleware(), roomController.rejectInvitation);
// User search (for inviting)
router.get('/users/search', authMiddleware(), roomController.searchUsers);

// ===== DJ ROTATION MODE =====
// Create rotation room
router.post('/rooms/dj-rotation/create', authMiddleware(), djRotationController.createRotationRoom);
// Get room state
router.get('/rooms/:roomId/dj-rotation/state', authMiddleware(), djRotationController.getRoomState);
// DJ management
router.post('/rooms/:roomId/dj-rotation/dj/add', authMiddleware(), djRotationController.addDj);
router.post('/rooms/:roomId/dj-rotation/dj/remove', authMiddleware(), djRotationController.removeDj);
router.post('/rooms/:roomId/dj-rotation/dj/join-slot', authMiddleware(), djRotationController.joinSlot);
router.post('/rooms/:roomId/dj-rotation/dj/leave-slot', authMiddleware(), djRotationController.leaveSlot);
// DJ track management
router.post('/rooms/:roomId/dj-rotation/dj/add-track', authMiddleware(), djRotationController.addTrack);
router.post('/rooms/:roomId/dj-rotation/dj/remove-track', authMiddleware(), djRotationController.removeTrack);
// Manual advance (owner only)
router.post('/rooms/:roomId/dj-rotation/advance', authMiddleware(), djRotationController.advanceToNextDj);
// DJ reorder (owner only)
router.put('/rooms/:roomId/dj-rotation/reorder', authMiddleware(), djRotationController.reorderDjs);
// DJ queue reorder
router.put('/rooms/:roomId/dj-rotation/dj/queue/reorder', authMiddleware(), djRotationController.reorderDjQueue);

// ===== VOTE SKIP =====
router.post('/rooms/:roomId/vote-skip', authMiddleware(), voteSkipController.voteSkip);
router.delete('/rooms/:roomId/vote-skip', authMiddleware(), voteSkipController.unvoteSkip);
router.get('/rooms/:roomId/vote-skip/status', authMiddleware(), voteSkipController.getVoteSkipStatus);

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


