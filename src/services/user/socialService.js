/**
 * Social Service - Tương tác xã hội
 */
const SongComment = require('../../models/SongComment');
const CommentReply = require('../../models/CommentReply');
const SongLike = require('../../models/SongLike');
const SongShare = require('../../models/SongShare');
const UserFollow = require('../../models/UserFollow');
const ArtistFollow = require('../../models/ArtistFollow');
const AlbumLike = require('../../models/AlbumLike');
const Notification = require('../../models/Notification');
const Song = require('../../models/Song');
const Artist = require('../../models/Artist');
const Album = require('../../models/Album');
const { generateUniqueRandomId } = require('../../utils/generateId');

class SocialService {
  /**
   * ===== COMMENTS =====
   */

  /**
   * Comment bài hát
   */
  async commentSong(songId, userId, userName, userAvatar, content, timestamp = null) {
    const comment = await SongComment.create({
      commentId: await generateUniqueRandomId(SongComment, 'commentId'),
      songId,
      userId,
      userName,
      userAvatar,
      content,
      timestamp,
      likeCount: 0,
      replyCount: 0,
    });

    // Update commentCount của song
    await Song.updateOne({ songId }, { $inc: { commentCount: 1 } });

    return comment;
  }

  /**
   * Reply comment
   */
  async replyComment(commentId, songId, userId, userName, userAvatar, content, mentionedUserId = null) {
    const reply = await CommentReply.create({
      replyId: await generateUniqueRandomId(CommentReply, 'replyId'),
      commentId,
      songId,
      userId,
      userName,
      userAvatar,
      content,
      mentionedUserId,
      likeCount: 0,
    });

    // Update replyCount của comment
    await SongComment.updateOne({ commentId }, { $inc: { replyCount: 1 } });

    // Tạo notification cho người được mention
    if (mentionedUserId) {
      await this.createNotification(mentionedUserId, 'REPLY', {
        actorId: userId,
        actorName: userName,
        targetId: commentId,
        targetType: 'comment',
      });
    }

    return reply;
  }

  /**
   * Like comment
   */
  async likeComment(commentId, userId) {
    const comment = await SongComment.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Kiểm tra đã like chưa
    const existingLike = comment.likes.find(l => l.userId === userId);
    if (existingLike) {
      // Unlike
      comment.likes = comment.likes.filter(l => l.userId !== userId);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      // Like
      comment.likes.push({ userId, likedAt: new Date() });
      comment.likeCount += 1;
    }

    await comment.save();
    return comment;
  }

  /**
   * Lấy comments của bài hát
   */
  async getSongComments(songId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const comments = await SongComment.find({
      songId,
      isDeleted: false,
      parentCommentId: null, // Chỉ lấy top-level comments
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Lấy replies cho mỗi comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CommentReply.find({
          commentId: comment.commentId,
          isDeleted: false,
        })
          .sort({ createdAt: 1 })
          .limit(5); // Limit 5 replies mới nhất

        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    return commentsWithReplies;
  }

  /**
   * ===== LIKES =====
   */

  /**
   * Like/Unlike bài hát
   * Tự động lưu song vào MongoDB nếu chưa có
   */
  async likeSong(songId, userId) {
    const existing = await SongLike.findOne({ songId, userId });

    if (existing) {
      // Unlike
      await SongLike.deleteOne({ songId, userId });
      // Đảm bảo likeCount không bị âm
      await Song.updateOne(
        { songId, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } }
      );
      return { liked: false };
    } else {
      // Like - Đảm bảo song đã có trong MongoDB TRƯỚC KHI like
      let song = await Song.findOne({ songId });
      if (!song) {
        // Lưu song vào DB khi user like - PHẢI WAIT để đảm bảo có data
        const songService = require('./songService');
        try {
          song = await songService.saveSongToDB(songId);
        } catch (error) {
          // Nếu không lưu được (ZingMP3 API lỗi), throw error
          throw new Error(`Cannot save song to database: ${error.message}`);
        }
        
        // Nếu vẫn không lưu được, throw error
        if (!song) {
          throw new Error('Cannot save song to database. Please try again.');
        }
      }
      
      // Tạo like record
      await SongLike.create({ songId, userId, likedAt: new Date() });
      // Tăng likeCount
      await Song.updateOne({ songId }, { $inc: { likeCount: 1 } });
      return { liked: true };
    }
  }

  /**
   * Like/Unlike album
   */
  async likeAlbum(albumId, userId) {
    const existing = await AlbumLike.findOne({ albumId, userId });

    if (existing) {
      await AlbumLike.deleteOne({ albumId, userId });
      await Album.updateOne({ albumId }, { $inc: { likeCount: -1 } });
      return { liked: false };
    } else {
      await AlbumLike.create({ albumId, userId, likedAt: new Date() });
      await Album.updateOne({ albumId }, { $inc: { likeCount: 1 } });
      return { liked: true };
    }
  }

  /**
   * Kiểm tra user đã like chưa
   */
  async checkUserLikes(userId, songIds = [], albumIds = []) {
    const result = {
      songs: {},
      albums: {},
    };

    if (songIds.length > 0) {
      const songLikes = await SongLike.find({ userId, songId: { $in: songIds } });
      songLikes.forEach(like => {
        result.songs[like.songId] = true;
      });
    }

    if (albumIds.length > 0) {
      const albumLikes = await AlbumLike.find({ userId, albumId: { $in: albumIds } });
      albumLikes.forEach(like => {
        result.albums[like.albumId] = true;
      });
    }

    return result;
  }

  /**
   * Lấy danh sách bài hát đã like
   * Nếu song không có trong DB, sẽ lấy từ ZingMp3
   */
  async getLikedSongs(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await SongLike.countDocuments({ userId });
    
    const likes = await SongLike.find({ userId })
      .sort({ likedAt: -1 })
      .skip(skip)
      .limit(limit);

    const songIds = likes.map(l => l.songId);
    const songsData = await Song.find({ songId: { $in: songIds } })
      .select('songId title artistsNames artistIds thumbnail duration likeCount listenCount');

    // Map với likedAt từ SongLike và lấy thông tin từ ZingMp3 nếu không có trong DB
    const songService = require('./songService');
    const songs = await Promise.all(
      likes.map(async (like) => {
        let song = songsData.find(s => s.songId === like.songId);
        
        // Nếu không có trong DB, lấy từ ZingMp3
        if (!song) {
          try {
            const songInfo = await songService.getSongInfo(like.songId);
            // Map từ ZingMp3 format sang format cần thiết
            song = {
              songId: songInfo.encodeId || songInfo.id || like.songId,
              title: songInfo.title || 'Unknown Title',
              artistsNames: songInfo.artistsNames || (songInfo.artists || []).map(a => a.name).join(', ') || 'Unknown Artist',
              thumbnail: songInfo.thumbnail || songInfo.thumbnailM || null,
              duration: songInfo.duration || 0,
            };
          } catch (error) {
            // Nếu không lấy được từ ZingMp3, skip bài hát này
            console.error(`Failed to get song info for ${like.songId}:`, error.message);
            return null;
          }
        }
        
        return {
          songId: song.songId,
          title: song.title,
          artistsNames: song.artistsNames || song.artistIds?.join(', ') || 'Unknown Artist',
          thumbnail: song.thumbnail,
          duration: song.duration,
          likeCount: song.likeCount || 0,
          listenCount: song.listenCount || 0,
          likedAt: like.likedAt,
        };
      })
    );

    // Remove null entries
    const validSongs = songs.filter(Boolean);

    return {
      songs: validSongs,
      page,
      limit,
      total,
    };
  }

  /**
   * ===== FOLLOW =====
   */

  /**
   * Follow/Unfollow user
   */
  async followUser(followerId, followingId) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const existing = await UserFollow.findOne({ followerId, followingId });

    if (existing) {
      await UserFollow.deleteOne({ followerId, followingId });
      return { followed: false };
    } else {
      await UserFollow.create({ followerId, followingId, followedAt: new Date() });
      
      // Tạo notification
      await this.createNotification(followingId, 'FOLLOW', {
        actorId: followerId,
        targetId: followingId,
        targetType: 'user',
      });
      
      return { followed: true };
    }
  }

  /**
   * Follow/Unfollow artist
   */
  async followArtist(artistId, userId) {
    const existing = await ArtistFollow.findOne({ artistId, userId });

    if (existing) {
      await ArtistFollow.deleteOne({ artistId, userId });
      await Artist.updateOne({ artistId }, { $inc: { followerCount: -1 } });
      return { followed: false };
    } else {
      await ArtistFollow.create({ artistId, userId, followedAt: new Date() });
      await Artist.updateOne({ artistId }, { $inc: { followerCount: 1 } });
      return { followed: true };
    }
  }

  /**
   * Lấy danh sách artists đã follow
   */
  async getFollowedArtists(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const follows = await ArtistFollow.find({ userId })
      .sort({ followedAt: -1 })
      .skip(skip)
      .limit(limit);

    const artistIds = follows.map(f => f.artistId);
    const artists = await Artist.find({ artistId: { $in: artistIds } })
      .select('artistId name thumbnail followerCount');

    return artists;
  }

  /**
   * ===== SHARE =====
   */

  /**
   * Share bài hát
   */
  async shareSong(songId, userId, shareType = 'LINK') {
    const share = await SongShare.create({
      shareId: await generateUniqueRandomId(SongShare, 'shareId'),
      songId,
      userId,
      shareType,
      sharedAt: new Date(),
    });

    await Song.updateOne({ songId }, { $inc: { shareCount: 1 } });

    return share;
  }

  /**
   * ===== NOTIFICATIONS =====
   */

  /**
   * Tạo notification
   */
  async createNotification(userId, type, data = {}) {
    const { actorId, actorName, targetId, targetType } = data;

    let title = '';
    let content = '';

    switch (type) {
      case 'LIKE':
        title = 'New Like';
        content = `${actorName} liked your ${targetType}`;
        break;
      case 'COMMENT':
        title = 'New Comment';
        content = `${actorName} commented on your ${targetType}`;
        break;
      case 'REPLY':
        title = 'New Reply';
        content = `${actorName} replied to your comment`;
        break;
      case 'FOLLOW':
        title = 'New Follower';
        content = `${actorName} started following you`;
        break;
      case 'SHARE':
        title = 'New Share';
        content = `${actorName} shared your ${targetType}`;
        break;
      default:
        title = 'Notification';
        content = 'You have a new notification';
    }

    return Notification.create({
      notificationId: await generateUniqueRandomId(Notification, 'notificationId'),
      userId,
      type: type.toLowerCase(),
      title,
      content,
      actorId,
      targetId,
      targetType,
      isRead: false,
    });
  }

  /**
   * Lấy notifications của user
   */
  async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  /**
   * Đánh dấu notification đã đọc
   */
  async markNotificationAsRead(notificationId, userId) {
    return Notification.updateOne(
      { notificationId, userId },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Đánh dấu tất cả notifications đã đọc
   */
  async markAllNotificationsAsRead(userId) {
    return Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Đếm số notifications chưa đọc
   */
  async getUnreadNotificationCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }
}

module.exports = new SocialService();

