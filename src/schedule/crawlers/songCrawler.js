/**
 * Crawler cho Songs
 * Lấy dữ liệu bài hát từ ZingMp3 API và lưu vào MongoDB
 */
const Song = require('../../models/Song');
const apiService = require('../services/apiService');
const { mapSongToModel, extractSongIds } = require('../utils/dataMapper');

class SongCrawler {
  constructor() {
    this.processedSongs = new Set();
  }

  /**
   * Crawl songs từ Home page
   */
  async crawlFromHome() {
    console.log('🔄 Crawling songs from Home...');
    try {
      const homeData = await apiService.getHome();
      const songIds = extractSongIds(homeData);
      
      console.log(`📊 Found ${songIds.length} songs in Home`);
      await this.processSongs(songIds);
    } catch (error) {
      console.error('❌ Error crawling from Home:', error.message);
      throw error;
    }
  }

  /**
   * Crawl songs từ Top 100
   */
  async crawlFromTop100() {
    console.log('🔄 Crawling songs from Top 100...');
    try {
      const top100Data = await apiService.getTop100();
      const songIds = new Set();
      const { isSong } = require('../utils/dataMapper');
      
      if (top100Data.items) {
        top100Data.items.forEach(group => {
          if (group.items) {
            group.items.forEach(item => {
              // CHỈ lấy songs, không lấy albums/playlists
              if (item.encodeId && isSong(item)) {
                songIds.add(item.encodeId);
              }
            });
          }
        });
      }
      
      console.log(`📊 Found ${songIds.size} songs in Top 100`);
      await this.processSongs(Array.from(songIds));
    } catch (error) {
      console.error('❌ Error crawling from Top 100:', error.message);
      throw error;
    }
  }

  /**
   * Crawl songs từ Chart Home
   */
  async crawlFromChartHome() {
    console.log('🔄 Crawling songs from Chart Home...');
    try {
      const chartData = await apiService.getChartHome();
      const songIds = new Set();
      const { isSong } = require('../utils/dataMapper');
      
      if (chartData.RTChart?.items) {
        chartData.RTChart.items.forEach(song => {
          if (song.encodeId && isSong(song)) {
            songIds.add(song.encodeId);
          }
        });
      }
      
      if (chartData.weekChart) {
        ['vn', 'us', 'korea'].forEach(country => {
          if (chartData.weekChart[country]?.items) {
            chartData.weekChart[country].items.forEach(song => {
              if (song.encodeId && isSong(song)) {
                songIds.add(song.encodeId);
              }
            });
          }
        });
      }
      
      console.log(`📊 Found ${songIds.size} songs in Chart Home`);
      await this.processSongs(Array.from(songIds));
    } catch (error) {
      console.error('❌ Error crawling from Chart Home:', error.message);
      throw error;
    }
  }

  /**
   * Crawl songs từ New Release Chart
   */
  async crawlFromNewReleaseChart() {
    console.log('🔄 Crawling songs from New Release Chart...');
    try {
      const chartData = await apiService.getNewReleaseChart();
      const songIds = [];
      const { isSong } = require('../utils/dataMapper');
      
      if (chartData.items) {
        chartData.items.forEach(item => {
          // CHỈ lấy songs
          if (item.encodeId && isSong(item)) {
            songIds.push(item.encodeId);
          }
        });
      }
      
      console.log(`📊 Found ${songIds.length} songs in New Release Chart`);
      await this.processSongs(songIds);
    } catch (error) {
      console.error('❌ Error crawling from New Release Chart:', error.message);
      throw error;
    }
  }

  /**
   * Crawl songs từ Search (popular keywords)
   */
  async crawlFromSearch(keywords = ['Sơn Tùng', 'Đen Vâu', 'Jack', 'AMEE', 'HIEUTHUHAI']) {
    console.log('🔄 Crawling songs from Search...');
    const allSongIds = new Set();
    const { isSong } = require('../utils/dataMapper');
    
    for (const keyword of keywords) {
      try {
        const searchData = await apiService.search(keyword);
        
        // Lấy top result (nếu là song)
        if (searchData.top?.encodeId && isSong(searchData.top)) {
          allSongIds.add(searchData.top.encodeId);
        }
        
        // Lấy từ songs array (limit 20) - chắc chắn là songs
        if (searchData.songs) {
          searchData.songs.slice(0, 20).forEach(song => {
            if (song.encodeId && isSong(song)) {
              allSongIds.add(song.encodeId);
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error searching for "${keyword}":`, error.message);
      }
    }
    
    console.log(`📊 Found ${allSongIds.size} unique songs from Search`);
    await this.processSongs(Array.from(allSongIds));
  }

  /**
   * Validate song ID format
   */
  isValidSongId(songId) {
    if (!songId || typeof songId !== 'string') return false;
    // ZingMp3 song IDs thường có format: ZWZBxxxxx hoặc SBCxxxxx (8 ký tự)
    return songId.length >= 6 && songId.length <= 10;
  }

  /**
   * Validate streaming URL - phải là http/https link thực sự
   */
  isValidStreamingUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Phải bắt đầu bằng http:// hoặc https://
    const isValid = url.startsWith('http://') || url.startsWith('https://');
    
    // Không được là "VIP" hay các string đặc biệt khác
    const isNotSpecial = !url.toUpperCase().includes('VIP') && 
                         !url.toUpperCase().includes('PREMIUM') &&
                         url.length > 10; // URL hợp lệ phải dài hơn 10 ký tự
    
    return isValid && isNotSpecial;
  }

  /**
   * Xử lý và lưu danh sách songs
   */
  async processSongs(songIds) {
    let saved = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;

    // Filter valid song IDs
    const validSongIds = songIds.filter(id => {
      if (!this.isValidSongId(id)) {
        skipped++;
        return false;
      }
      return true;
    });

    if (skipped > 0) {
      console.log(`⚠️ Skipped ${skipped} invalid song IDs`);
    }

    for (const songId of validSongIds) {
      if (this.processedSongs.has(songId)) {
        continue; // Đã xử lý rồi
      }

      try {
        // Lấy thông tin bài hát (skipNotFound = true để không retry khi không tìm thấy)
        const songInfo = await apiService.getSongInfo(songId, true);
        
        // Lấy link streaming - BẮT BUỘC phải có
        let streamingUrl = null;
        try {
          const streamData = await apiService.getSongStream(songId, true);
          
          // Ưu tiên: 128 > lossless > bất kỳ giá trị nào khác (KHÔNG lấy 320 vì có thể là "VIP")
          const possibleUrls = [
            streamData['128'],      // Ưu tiên 128 (luôn có URL thật)
            streamData['lossless'], // Lossless nếu có
            ...Object.values(streamData).filter(url => url !== streamData['320']) // Các giá trị khác, trừ 320
          ];
          
          // Tìm URL hợp lệ đầu tiên
          for (const url of possibleUrls) {
            if (this.isValidStreamingUrl(url)) {
              streamingUrl = url;
              break;
            }
          }
        } catch (error) {
          // Skip nếu không lấy được stream URL
          skipped++;
          this.processedSongs.add(songId);
          continue;
        }

        // Nếu không có streamingUrl hợp lệ, SKIP bài hát này
        if (!this.isValidStreamingUrl(streamingUrl)) {
          skipped++;
          this.processedSongs.add(songId);
          console.log(`⏭️ Skipped song ${songId}: No valid streaming URL (got: ${streamingUrl || 'null'})`);
          continue;
        }

        // Lấy lyric nếu có
        let lyric = null;
        if (songInfo.hasLyric) {
          try {
            const lyricData = await apiService.getLyric(songId);
            lyric = lyricData.lyric || null;
          } catch (error) {
            // Không quan trọng nếu không lấy được lyric
          }
        }

        // Map dữ liệu
        const songData = mapSongToModel(songInfo, streamingUrl);
        if (lyric) {
          songData.lyric = lyric;
          songData.hasLyric = true;
        }

        // Lưu vào MongoDB (upsert)
        const result = await Song.findOneAndUpdate(
          { songId: songData.songId },
          songData,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          saved++;
          console.log(`✅ Saved new song: ${songData.title} (${songData.songId})`);
        } else {
          updated++;
          console.log(`🔄 Updated song: ${songData.title} (${songData.songId})`);
        }

        this.processedSongs.add(songId);
      } catch (error) {
        // Nếu là lỗi "not found", skip ngay (không đếm là error)
        if (error.message.includes('Không tìm thấy') || 
            error.message.includes('not found') ||
            error.message.includes('Not Found')) {
          skipped++;
          this.processedSongs.add(songId);
          // Không log lỗi cho "not found" để giảm spam
          continue;
        }
        
        errors++;
        console.error(`❌ Error processing song ${songId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary: ${saved} saved, ${updated} updated, ${skipped} skipped (not found/no stream), ${errors} errors\n`);
  }

  /**
   * Crawl tất cả nguồn
   */
  async crawlAll() {
    console.log('🚀 Starting Song Crawler...\n');
    
    try {
      await this.crawlFromHome();
      await this.crawlFromTop100();
      await this.crawlFromChartHome();
      await this.crawlFromNewReleaseChart();
      await this.crawlFromSearch();
      
      console.log('✅ Song Crawler completed!');
    } catch (error) {
      console.error('❌ Song Crawler failed:', error);
      throw error;
    }
  }
}

module.exports = new SongCrawler();

