/**
 * Crawler cho Playlists
 * Lấy dữ liệu playlist từ ZingMp3 API và lưu vào MongoDB
 */
const Playlist = require('../../models/Playlist');
const apiService = require('../services/apiService');
const { mapPlaylistToModel } = require('../utils/dataMapper');

class PlaylistCrawler {
  constructor() {
    this.processedPlaylists = new Set();
  }

  /**
   * Crawl playlists từ Home page
   */
  async crawlFromHome() {
    console.log('🔄 Crawling playlists from Home...');
    try {
      const homeData = await apiService.getHome();
      const playlistIds = new Set();
      
      // Tìm playlists trong home items
      if (homeData.items) {
        homeData.items.forEach(item => {
          if (item.sectionType === 'playlist' && item.items) {
            item.items.forEach(playlist => {
              if (playlist.encodeId) {
                playlistIds.add(playlist.encodeId);
              }
            });
          }
        });
      }
      
      console.log(`📊 Found ${playlistIds.size} playlists in Home`);
      await this.processPlaylists(Array.from(playlistIds));
    } catch (error) {
      console.error('❌ Error crawling playlists from Home:', error.message);
      throw error;
    }
  }

  /**
   * Crawl Top 100 playlists
   */
  async crawlFromTop100() {
    console.log('🔄 Crawling playlists from Top 100...');
    try {
      const top100Data = await apiService.getTop100();
      const playlistIds = new Set();
      
      if (top100Data.items) {
        top100Data.items.forEach(group => {
          if (group.group?.playlistId) {
            playlistIds.add(group.group.playlistId);
          }
        });
      }
      
      console.log(`📊 Found ${playlistIds.size} playlists in Top 100`);
      await this.processPlaylists(Array.from(playlistIds));
    } catch (error) {
      console.error('❌ Error crawling playlists from Top 100:', error.message);
      throw error;
    }
  }

  /**
   * Crawl playlists từ Search
   */
  async crawlFromSearch(keywords = ['Top 100', 'Nhạc Việt', 'Nhạc Trẻ']) {
    console.log('🔄 Crawling playlists from Search...');
    const allPlaylistIds = new Set();
    
    for (const keyword of keywords) {
      try {
        const searchData = await apiService.search(keyword);
        
        if (searchData.playlists) {
          searchData.playlists.slice(0, 10).forEach(playlist => {
            if (playlist.encodeId) {
              allPlaylistIds.add(playlist.encodeId);
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error searching playlists for "${keyword}":`, error.message);
      }
    }
    
    console.log(`📊 Found ${allPlaylistIds.size} unique playlists from Search`);
    await this.processPlaylists(Array.from(allPlaylistIds));
  }

  /**
   * Xử lý và lưu danh sách playlists
   */
  async processPlaylists(playlistIds) {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const playlistId of playlistIds) {
      if (this.processedPlaylists.has(playlistId)) {
        continue;
      }

      try {
        // Lấy chi tiết playlist
        const playlistData = await apiService.getPlaylistDetail(playlistId);
        
        // Map dữ liệu
        const playlistModel = mapPlaylistToModel(playlistData);

        // Lưu vào MongoDB
        const result = await Playlist.findOneAndUpdate(
          { playlistId: playlistModel.playlistId },
          playlistModel,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          saved++;
          console.log(`✅ Saved new playlist: ${playlistModel.title} (${playlistModel.playlistId})`);
        } else {
          // Update songIds và songCount
          await Playlist.updateOne(
            { playlistId: playlistModel.playlistId },
            { 
              $set: { 
                songIds: playlistModel.songIds,
                songCount: playlistModel.songCount 
              } 
            }
          );
          updated++;
          console.log(`🔄 Updated playlist: ${playlistModel.title} (${playlistModel.playlistId})`);
        }

        this.processedPlaylists.add(playlistId);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing playlist ${playlistId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary: ${saved} saved, ${updated} updated, ${errors} errors\n`);
  }

  /**
   * Crawl tất cả nguồn
   */
  async crawlAll() {
    console.log('🚀 Starting Playlist Crawler...\n');
    
    try {
      await this.crawlFromHome();
      await this.crawlFromTop100();
      await this.crawlFromSearch();
      
      console.log('✅ Playlist Crawler completed!');
    } catch (error) {
      console.error('❌ Playlist Crawler failed:', error);
      throw error;
    }
  }
}

module.exports = new PlaylistCrawler();

