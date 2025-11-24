/**
 * Song Service - User APIs
 * Lazy loading: Chỉ lưu metadata vào DB, streaming URL call trực tiếp ZingMp3
 */
const Song = require('../../models/Song');
const UserPlayHistory = require('../../models/UserPlayHistory');
const zingmp3Service = require('../zingmp3Service');
const { mapSongToModel } = require('../../schedule/utils/dataMapper');

class SongService {
  /**
   * Lấy thông tin bài hát từ ZingMp3 và tự động lưu vào DB
   * Lưu vào DB ngay khi lấy thông tin để có thể dùng cho playlist, like, follow
   */
  async getSongInfo(songId) {
    // Kiểm tra trong DB trước
    let song = await Song.findOne({ songId });
    
    // Lấy fresh data từ ZingMp3
    let songInfo;
    try {
      songInfo = await zingmp3Service.getSongInfo(songId);
    } catch (error) {
      // Nếu ZingMp3 lỗi nhưng có trong DB → trả về data từ DB
      if (song) {
        return song;
      }
      // Check if it's a "not found" error from ZingMp3
      if (error.message && (error.message.includes('Không tìm thấy') || error.message.includes('not found'))) {
        throw new Error(`Song not found: Song ID "${songId}" does not exist in ZingMp3`);
      }
      throw new Error(`Song not found: ${error.message}`);
    }
    
    // Tự động lưu vào DB (nếu chưa có hoặc cần cập nhật)
    if (!song) {
      // Chưa có trong DB → Lưu mới
      try {
        song = await this.saveSongToDB(songId, songInfo);
      } catch (error) {
        // Log lỗi nhưng vẫn trả về data từ ZingMp3
        console.error(`Failed to save song ${songId} to DB:`, error.message);
      }
    }
    
    // Trả về data mới nhất từ ZingMp3
    return songInfo;
  }

  /**
   * Lưu bài hát vào MongoDB
   * Chỉ lưu những trường có trong Song model
   */
  async saveSongToDB(songId, songInfo = null) {
    try {
      // Kiểm tra xem đã có trong DB chưa
      const existing = await Song.findOne({ songId });
      if (existing) {
        return existing;
      }

      // Nếu chưa có songInfo → fetch từ ZingMp3
      if (!songInfo) {
        songInfo = await zingmp3Service.getSongInfo(songId);
      }

      // Map dữ liệu từ ZingMp3 sang Song model (chỉ những trường có trong Song.js)
      // mapSongToModel đã không map streamingUrl và streamingUrlExpiry
      const songData = mapSongToModel(songInfo, null);

      // Lưu vào DB
      const song = await Song.create(songData);
      console.log(`✓ Saved song ${songId} to DB: ${song.title} - ${song.artistsNames}`);
      return song;
    } catch (error) {
      // Nếu lỗi duplicate (đã có trong DB) → trả về song hiện có
      if (error.code === 11000 || error.message.includes('duplicate')) {
        const existing = await Song.findOne({ songId });
        if (existing) {
          return existing;
        }
      }
      // Log error và throw để caller biết có lỗi
      console.error(`✗ Failed to save song ${songId} to DB:`, error.message);
      throw error;
    }
  }

  /**
   * Lấy streaming URL (call trực tiếp ZingMp3, không cache vào DB)
   * Streaming URL không được lưu vào DB, luôn lấy fresh từ ZingMp3
   */
  async getStreamingUrl(songId, cache = true) {
    // Call ZingMp3 API để lấy URL mới (luôn fresh, không cache vào DB)
    try {
      const streamingUrl = await zingmp3Service.getStreamingUrl(songId);
      return streamingUrl;
    } catch (error) {
      // Check if it's a "not found" error from ZingMp3
      if (error.message && (error.message.includes('Không tìm thấy') || error.message.includes('not found'))) {
        throw new Error(`Song not found: Song ID "${songId}" does not exist in ZingMp3`);
      }
      throw new Error(`Failed to get streaming URL: ${error.message}`);
    }
  }

  /**
   * Lấy lời bài hát - Dùng trực tiếp từ ZingMp3
   */
  async getLyric(songId) {
    // Gọi trực tiếp ZingMp3 API
    try {
      const lyricData = await zingmp3Service.getLyric(songId);
      return lyricData;
    } catch (error) {
      return { lyric: null, hasLyric: false };
    }
  }

  /**
   * Tìm kiếm bài hát - Dùng trực tiếp ZingMp3
   * Tự động lưu các bài hát tìm được vào DB
   */
  async search(keyword, limit = 20) {
    // Gọi trực tiếp ZingMp3 API
    // zingmp3Service.search() đã unwrap và trả về data.data (format: { top: {...}, songs: [...], playlists: [...], ... })
    const searchData = await zingmp3Service.search(keyword);
    
    // Tự động lưu các bài hát vào DB (async, không block response)
    // Dữ liệu từ search có thể không đầy đủ, saveSongToDB sẽ tự động fetch thêm từ getSongInfo nếu cần
    
    // Lưu bài hát top (nếu có)
    if (searchData && searchData.top && searchData.top.encodeId) {
      const topSongId = searchData.top.encodeId || searchData.top.id;
      if (topSongId) {
        this.saveSongToDB(topSongId, searchData.top).catch(error => {
          console.error(`Failed to save top song ${topSongId} from search to DB:`, error.message);
        });
      }
    }
    
    // Lưu danh sách bài hát
    if (searchData && searchData.songs && Array.isArray(searchData.songs)) {
      searchData.songs.forEach(song => {
        if (song.encodeId || song.id) {
          const songId = song.encodeId || song.id;
          // Lưu vào DB (saveSongToDB sẽ tự động fetch thêm từ getSongInfo nếu thiếu thông tin)
          this.saveSongToDB(songId, song).catch(error => {
            console.error(`Failed to save song ${songId} from search to DB:`, error.message);
          });
        }
      });
    }
    
    // Trả về dữ liệu search (format từ ZingMp3: { top: {...}, songs: [...], playlists: [...], ... })
    return searchData;
  }

  /**
   * Lấy danh sách bài hát phổ biến
   * Dùng trực tiếp từ ZingMp3 Chart Home
   */
  async getPopularSongs(limit = 20) {
    // Lấy từ ZingMp3 Chart Home (RTChart)
    const chartData = await zingmp3Service.getChartHome();
    
    if (chartData.RTChart && chartData.RTChart.items) {
      return chartData.RTChart.items.slice(0, limit);
    }
    
    return [];
  }

  /**
   * Lấy bài hát mới phát hành
   * Dùng trực tiếp từ ZingMp3
   */
  async getNewReleases(limit = 20) {
    // Lấy từ ZingMp3 API
    const chartData = await zingmp3Service.getNewReleaseChart();
    
    if (chartData.items) {
      return chartData.items.slice(0, limit);
    }
    
    return [];
  }

  /**
   * Track lịch sử nghe nhạc (cho AI)
   */
  async trackPlayHistory(userId, songId, data = {}) {
    const {
      playDuration = 0,
      playPercentage = 0,
      isCompleted = false,
      isSkipped = false,
      context = 'other',
      device = null,
    } = data;

    // Tính timeOfDay và dayOfWeek
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';

    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

    // Lưu vào UserPlayHistory
    await UserPlayHistory.create({
      userId,
      songId,
      playedAt: now,
      playDuration,
      playPercentage,
      isCompleted,
      isSkipped,
      context,
      device,
      timeOfDay,
      dayOfWeek,
    });

    // Update listenCount của song
    await Song.updateOne(
      { songId },
      { $inc: { listenCount: 1 } }
    );
  }

  /**
   * Lấy bài hát theo ID (với streaming URL)
   * Tự động lưu vào MongoDB khi lấy thông tin
   */
  async getSongWithStream(songId, userId = null, cache = true) {
    // Lấy metadata từ ZingMp3 và tự động lưu vào DB
    const songInfo = await this.getSongInfo(songId);
    
    // Lấy streaming URL (có cache)
    const streamingUrl = await this.getStreamingUrl(songId, cache);
    
    // Nếu có userId → Track play history (cho AI)
    if (userId) {
      // Track play history (async, không block response)
      this.trackPlayHistory(userId, songId, { context: 'other' }).catch(console.error);
    }
    
    return {
      ...songInfo,
      streamingUrl, // Thêm streaming URL vào response
    };
  }
}

module.exports = new SongService();

