/**
 * Playlist Service - Quản lý playlist cá nhân
 */
const Playlist = require('../../models/Playlist');
const PlaylistInteraction = require('../../models/PlaylistInteraction');
const Song = require('../../models/Song');
const { generateUniqueRandomId } = require('../../utils/generateId');
const songService = require('./songService');

class PlaylistService {
  /**
   * Tạo playlist mới
   */
  async createPlaylist(userId, data) {
    const { title, description, isPublic = true, thumbnail = null } = data;

    // Đảm bảo userId là String để match với Playlist.userId (String)
    const userIdString = String(userId);

    const playlist = await Playlist.create({
      playlistId: await generateUniqueRandomId(Playlist, 'playlistId'),
      title,
      description,
      thumbnail,
      userId: userIdString,
      isPublic,
      songIds: [],
      songCount: 0,
      likeCount: 0,
      followCount: 0,
      playCount: 0,
    });

    return playlist;
  }

  /**
   * Lấy playlists của user
   */
  async getUserPlaylists(userId, isPublic = null) {
    // Convert userId sang String để match với Playlist.userId (String)
    const query = { userId: String(userId) };
    if (isPublic !== null) {
      query.isPublic = isPublic;
    }

    return Playlist.find(query)
      .sort({ updatedAt: -1 })
      .select('playlistId title thumbnail description songCount likeCount followCount playCount isPublic')
      .lean(); // Dùng lean() để tăng tốc độ
  }

  /**
   * Lấy playlist theo ID
   */
  async getPlaylistById(playlistId, userId = null) {
    const playlist = await Playlist.findOne({ playlistId }).lean();
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Kiểm tra quyền truy cập
    if (!playlist.isPublic && userId && String(playlist.userId) !== String(userId)) {
      throw new Error('Playlist is private');
    }

    // Lấy thông tin bài hát - tối ưu với select và lean
    const songs = await Song.find({ songId: { $in: playlist.songIds } })
      .select('songId title artistIds albumId duration thumbnail likeCount listenCount')
      .limit(100) // Limit 100 bài đầu
      .lean(); // Dùng lean() để tăng tốc độ

    playlist.songs = songs;

    // Kiểm tra user đã like/follow chưa - chỉ select fields cần thiết
    if (userId) {
      const interaction = await PlaylistInteraction.findOne({
        playlistId,
        userId: String(userId)
      }).select('isLiked isFollowed').lean();
      playlist.isLiked = interaction?.isLiked || false;
      playlist.isFollowed = interaction?.isFollowed || false;
    }

    return playlist;
  }

  /**
   * Cập nhật playlist
   */
  async updatePlaylist(playlistId, userId, data) {
    const playlist = await Playlist.findOne({ playlistId }).select('userId');
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Convert cả hai về String để so sánh
    if (String(playlist.userId) !== String(userId)) {
      throw new Error('Not authorized to update this playlist');
    }

    const { title, description, thumbnail, isPublic } = data;
    if (title) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (thumbnail !== undefined) playlist.thumbnail = thumbnail;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();
    return playlist;
  }

  /**
   * Xóa playlist
   */
  async deletePlaylist(playlistId, userId) {
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Convert cả hai về String để so sánh
    if (String(playlist.userId) !== String(userId)) {
      throw new Error('Not authorized to delete this playlist');
    }

    await Playlist.deleteOne({ playlistId });
    return { deleted: true };
  }

  /**
   * Thêm bài hát vào playlist
   * Tự động lưu song vào DB nếu chưa có
   */
  async addSongToPlaylist(playlistId, songId, userId) {
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Kiểm tra quyền (chỉ owner mới được thêm)
    // Convert cả hai về String để so sánh (vì User.id là Number, Playlist.userId là String)
    const playlistUserId = String(playlist.userId);
    const requestUserId = String(userId);

    if (playlistUserId !== requestUserId) {
      throw new Error('Not authorized to modify this playlist');
    }

    // Kiểm tra bài hát đã có chưa
    if (playlist.songIds.includes(songId)) {
      throw new Error('Song already in playlist');
    }

    // Đảm bảo song đã có trong DB trước khi thêm vào playlist
    let song = await Song.findOne({ songId });
    if (!song) {
      // Tự động lưu song vào DB
      try {
        song = await songService.saveSongToDB(songId);
      } catch (error) {
        // Nếu không lưu được, vẫn thử thêm vào playlist (songId vẫn hợp lệ)
        console.error(`Warning: Could not save song ${songId} to DB: ${error.message}`);
      }
    }

    // Thêm vào playlist
    playlist.songIds.push(songId);
    playlist.songCount = playlist.songIds.length;
    await playlist.save();

    return playlist;
  }

  /**
   * Xóa bài hát khỏi playlist
   */
  async removeSongFromPlaylist(playlistId, songId, userId) {
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Convert cả hai về String để so sánh
    if (String(playlist.userId) !== String(userId)) {
      throw new Error('Not authorized to modify this playlist');
    }

    playlist.songIds = playlist.songIds.filter(id => id !== songId);
    playlist.songCount = playlist.songIds.length;
    await playlist.save();

    return playlist;
  }

  /**
   * Sắp xếp lại thứ tự bài hát trong playlist
   */
  async reorderPlaylistSongs(playlistId, userId, songIds) {
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Convert cả hai về String để so sánh
    if (String(playlist.userId) !== String(userId)) {
      throw new Error('Not authorized to modify this playlist');
    }

    // Validate: tất cả songIds phải có trong playlist
    const isValid = songIds.every(id => playlist.songIds.includes(id));
    if (!isValid || songIds.length !== playlist.songIds.length) {
      throw new Error('Invalid song order');
    }

    playlist.songIds = songIds;
    await playlist.save();

    return playlist;
  }

  /**
   * Like/Unlike playlist
   */
  async likePlaylist(playlistId, userId) {
    const userIdString = String(userId);
    let interaction = await PlaylistInteraction.findOne({
      playlistId,
      userId: userIdString
    });

    if (interaction?.isLiked) {
      // Unlike
      interaction.isLiked = false;
      interaction.likedAt = null;
      await interaction.save();
      await Playlist.updateOne({ playlistId }, { $inc: { likeCount: -1 } });
      return { liked: false };
    } else {
      // Like
      if (!interaction) {
        interaction = await PlaylistInteraction.create({
          playlistId,
          userId: userIdString
        });
      }
      interaction.isLiked = true;
      interaction.likedAt = new Date();
      await interaction.save();
      await Playlist.updateOne({ playlistId }, { $inc: { likeCount: 1 } });
      return { liked: true };
    }
  }

  /**
   * Follow/Unfollow playlist
   */
  async followPlaylist(playlistId, userId) {
    const userIdString = String(userId);
    let interaction = await PlaylistInteraction.findOne({
      playlistId,
      userId: userIdString
    });

    if (interaction?.isFollowed) {
      // Unfollow
      interaction.isFollowed = false;
      interaction.followedAt = null;
      await interaction.save();
      await Playlist.updateOne({ playlistId }, { $inc: { followCount: -1 } });
      return { followed: false };
    } else {
      // Follow
      if (!interaction) {
        interaction = await PlaylistInteraction.create({
          playlistId,
          userId: userIdString
        });
      }
      interaction.isFollowed = true;
      interaction.followedAt = new Date();
      await interaction.save();
      await Playlist.updateOne({ playlistId }, { $inc: { followCount: 1 } });
      return { followed: true };
    }
  }

  /**
   * Lấy playlists công khai
   */
  async getPublicPlaylists(limit = 20, sortBy = 'playCount') {
    const sortOptions = {
      playCount: { playCount: -1 },
      likeCount: { likeCount: -1 },
      followCount: { followCount: -1 },
      createdAt: { createdAt: -1 },
    };

    return Playlist.find({ isPublic: true })
      .sort(sortOptions[sortBy] || sortOptions.playCount)
      .limit(limit)
      .select('playlistId title thumbnail description userId songCount likeCount followCount playCount');
  }

  /**
   * Lấy playlists đã follow
   */
  async getFollowedPlaylists(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const userIdString = String(userId);

    const interactions = await PlaylistInteraction.find({
      userId: userIdString,
      isFollowed: true
    })
      .sort({ followedAt: -1 })
      .skip(skip)
      .limit(limit);

    const playlistIds = interactions.map(i => i.playlistId);
    return Playlist.find({ playlistId: { $in: playlistIds } })
      .select('playlistId title thumbnail description userId songCount likeCount followCount playCount');
  }

  /**
   * Tăng playCount khi user play playlist
   */
  async incrementPlayCount(playlistId) {
    await Playlist.updateOne({ playlistId }, { $inc: { playCount: 1 } });
  }
}

module.exports = new PlaylistService();

