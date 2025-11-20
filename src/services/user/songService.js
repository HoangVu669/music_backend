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
   * Lấy thông tin bài hát từ ZingMp3 trực tiếp
   * Chỉ lưu vào MongoDB khi user tương tác (play, like) - để dùng cho AI
   */
  async getSongInfo(songId) {
    // Kiểm tra trong DB trước (có thể đã có từ lần user tương tác trước)
    const song = await Song.findOne({ songId });
    
    if (song) {
      // Nếu có trong DB → trả về, nhưng vẫn lấy fresh data từ ZingMp3 để đảm bảo cập nhật
      try {
        const freshData = await zingmp3Service.getSongInfo(songId);
        return freshData; // Trả về data mới nhất từ ZingMp3
      } catch (error) {
        // Nếu ZingMp3 lỗi nhưng có trong DB → trả về data từ DB
        return song;
      }
    }
    
    // Nếu chưa có trong DB → Fetch từ ZingMp3 (không lưu vào DB ngay)
    try {
      const songInfo = await zingmp3Service.getSongInfo(songId);
      return songInfo; // Trả về trực tiếp từ ZingMp3
    } catch (error) {
      // Check if it's a "not found" error from ZingMp3
      if (error.message && (error.message.includes('Không tìm thấy') || error.message.includes('not found'))) {
        throw new Error(`Song not found: Song ID "${songId}" does not exist in ZingMp3`);
      }
      throw new Error(`Song not found: ${error.message}`);
    }
  }

  /**
   * Lưu bài hát vào MongoDB (chỉ khi user tương tác - cho AI)
   */
  async saveSongToDB(songId, songInfo = null) {
    try {
      const existing = await Song.findOne({ songId });
      if (existing) {
        return existing;
      }

      // Nếu chưa có songInfo → fetch từ ZingMp3
      if (!songInfo) {
        songInfo = await zingmp3Service.getSongInfo(songId);
      }

      // Lưu metadata vào DB (không lưu streamingUrl)
      const songData = mapSongToModel(songInfo, null);
      songData.streamingUrl = null;
      songData.streamingUrlExpiry = null;

      const song = await Song.create(songData);
      console.log(`✓ Saved song ${songId} to DB: ${song.title} - ${song.artistsNames}`);
      return song;
    } catch (error) {
      // Log error và throw để caller biết có lỗi
      console.error(`✗ Failed to save song ${songId} to DB:`, error.message);
      throw error; // Throw để caller handle
    }
  }

  /**
   * Lấy streaming URL (call trực tiếp ZingMp3, có thể cache)
   * Chỉ cache vào DB nếu song đã có trong DB (từ user tương tác)
   */
  async getStreamingUrl(songId, cache = true) {
    let song = await Song.findOne({ songId });

    // Nếu có cache trong DB và chưa expire → Dùng cache
    if (cache && song?.streamingUrl && song?.streamingUrlExpiry) {
      const now = new Date();
      const expiryTime = new Date(song.streamingUrlExpiry);
      
      // Nếu còn hơn 1 giờ nữa mới expire → Dùng cache
      if (expiryTime > new Date(now.getTime() + 60 * 60 * 1000)) {
        return song.streamingUrl;
      }
    }

    // Call ZingMp3 API để lấy URL mới (luôn fresh)
    try {
      const streamingUrl = await zingmp3Service.getStreamingUrl(songId);
      
      // Chỉ cache vào DB nếu song đã có trong DB (từ user tương tác trước)
      if (song) {
        song.streamingUrl = streamingUrl;
        song.streamingUrlExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await song.save();
      }
      // Nếu chưa có trong DB → không lưu, chỉ trả về URL
      
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
   * Tìm kiếm bài hát - Dùng trực tiếp ZingMp3, không lưu vào MongoDB
   * Chỉ lưu vào MongoDB khi user tương tác (play, like)
   */
  async search(keyword, limit = 20) {
    // Gọi trực tiếp ZingMp3 API
    const searchData = await zingmp3Service.search(keyword);
    
    // Không lưu vào DB ngay - chỉ trả về kết quả từ ZingMp3
    // MongoDB sẽ được cập nhật khi user play/like bài hát
    
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
   * Dùng trực tiếp ZingMp3, chỉ lưu vào MongoDB khi user tương tác
   */
  async getSongWithStream(songId, userId = null, cache = true) {
    // Lấy metadata trực tiếp từ ZingMp3
    const songInfo = await this.getSongInfo(songId);
    
    // Lấy streaming URL (có cache)
    const streamingUrl = await this.getStreamingUrl(songId, cache);
    
    // Nếu có userId → Lưu vào MongoDB và track play history (cho AI)
    if (userId) {
      // Lưu song vào DB để dùng cho AI (async, không block response)
      this.saveSongToDB(songId, songInfo).catch(console.error);
      
      // Track play history
      this.trackPlayHistory(userId, songId, { context: 'other' }).catch(console.error);
    }
    
    return {
      ...songInfo,
      streamingUrl, // Thêm streaming URL vào response
    };
  }
}

module.exports = new SongService();

