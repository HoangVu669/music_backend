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

    // Tối ưu: chỉ select fields cần thiết và dùng compound index
    const comments = await SongComment.find({
      songId,
      isDeleted: false,
      parentCommentId: null, // Chỉ lấy top-level comments
    })
      .select('commentId songId userId userName userAvatar content likeCount replyCount timestamp createdAt likes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Dùng lean() để tăng tốc độ

    // Nếu không có comments, return ngay
    if (comments.length === 0) {
      return [];
    }

    // Lấy replies cho mỗi comment - tối ưu với compound index
    const commentIds = comments.map(c => c.commentId);
    const allReplies = await CommentReply.find({
      commentId: { $in: commentIds },
      isDeleted: false,
    })
      .select('replyId commentId userId userName userAvatar content likeCount mentionedUserId createdAt likes')
      .sort({ createdAt: 1 })
      .limit(50) // Limit tổng số replies
      .lean();

    // Group replies by commentId - tối ưu với Map
    const repliesByComment = new Map();
    allReplies.forEach(reply => {
      if (!repliesByComment.has(reply.commentId)) {
        repliesByComment.set(reply.commentId, []);
      }
      const replies = repliesByComment.get(reply.commentId);
      if (replies.length < 5) {
        replies.push(reply);
      }
    });

    // Map comments với replies
    const commentsWithReplies = comments.map(comment => ({
      ...comment,
      replies: repliesByComment.get(comment.commentId) || [],
    }));

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
    const existing = await SongLike.findOne({ songId, userId }).select('_id').lean();

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
    const existing = await AlbumLike.findOne({ albumId, userId }).select('_id').lean();

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
      const songLikes = await SongLike.find({ userId, songId: { $in: songIds } })
        .select('songId')
        .lean();
      songLikes.forEach(like => {
        result.songs[like.songId] = true;
      });
    }

    if (albumIds.length > 0) {
      const albumLikes = await AlbumLike.find({ userId, albumId: { $in: albumIds } })
        .select('albumId')
        .lean();
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

    // Get total count - tối ưu với countDocuments
    const total = await SongLike.countDocuments({ userId });

    const likes = await SongLike.find({ userId })
      .sort({ likedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('songId likedAt')
      .lean(); // Dùng lean() để tăng tốc độ

    if (likes.length === 0) {
      return {
        songs: [],
        page,
        limit,
        total,
      };
    }

    const songIds = likes.map(l => l.songId);
    // Tối ưu: chỉ select fields cần thiết
    const songsData = await Song.find({ songId: { $in: songIds } })
      .select('songId title artistsNames artistIds thumbnail duration likeCount listenCount')
      .lean(); // Dùng lean() để tăng tốc độ

    // Tạo Map để lookup nhanh hơn O(1) thay vì O(n)
    const songsMap = new Map(songsData.map(s => [s.songId, s]));

    // Tối ưu: chỉ gọi ZingMp3 API cho các songs không có trong DB, batch nếu có thể
    const songService = require('./songService');
    const missingSongIds = likes.filter(l => !songsMap.has(l.songId)).map(l => l.songId);

    // Fetch missing songs từ ZingMp3 (song song nhưng giới hạn để tránh rate limit)
    if (missingSongIds.length > 0) {
      const missingSongsPromises = missingSongIds.slice(0, 5).map(async (songId) => {
        try {
          const songInfo = await songService.getSongInfo(songId);
          return {
            songId: songInfo.encodeId || songInfo.id || songId,
            title: songInfo.title || 'Unknown Title',
            artistsNames: songInfo.artistsNames || (songInfo.artists || []).map(a => a.name).join(', ') || 'Unknown Artist',
            thumbnail: songInfo.thumbnail || songInfo.thumbnailM || null,
            duration: songInfo.duration || 0,
            likeCount: 0,
            listenCount: 0,
          };
        } catch (error) {
          console.error(`Failed to get song info for ${songId}:`, error.message);
          return null;
        }
      });

      const missingSongs = (await Promise.all(missingSongsPromises)).filter(Boolean);
      missingSongs.forEach(song => songsMap.set(song.songId, song));
    }

    // Map với likedAt từ SongLike
    const songs = likes
      .map((like) => {
        const song = songsMap.get(like.songId);
        if (!song) return null; // Skip nếu không tìm thấy

        return {
          songId: song.songId,
          title: song.title,
          artistsNames: song.artistsNames || (Array.isArray(song.artistIds) ? song.artistIds.join(', ') : 'Unknown Artist'),
          thumbnail: song.thumbnail,
          duration: song.duration,
          likeCount: song.likeCount || 0,
          listenCount: song.listenCount || 0,
          likedAt: like.likedAt,
        };
      })
      .filter(Boolean); // Remove null entries

    return {
      songs,
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

    const existing = await UserFollow.findOne({ followerId, followingId }).select('_id').lean();

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
    const existing = await ArtistFollow.findOne({ artistId, userId }).select('_id').lean();

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
      .limit(limit)
      .select('artistId followedAt')
      .lean();

    const artistIds = follows.map(f => f.artistId);
    const artists = await Artist.find({ artistId: { $in: artistIds } })
      .select('artistId name thumbnail followerCount')
      .lean();

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
      .limit(limit)
      .lean(); // Dùng lean() để tăng tốc độ
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

