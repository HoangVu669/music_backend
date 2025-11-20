/**
 * Crawler cho Artists
 * Lấy dữ liệu nghệ sĩ từ ZingMp3 API và lưu vào MongoDB
 */
const Artist = require('../../models/Artist');
const apiService = require('../services/apiService');
const { mapArtistToModel, extractArtistIds } = require('../utils/dataMapper');

class ArtistCrawler {
  constructor() {
    this.processedArtists = new Set();
  }

  /**
   * Crawl artists từ Home page
   */
  async crawlFromHome() {
    console.log('🔄 Crawling artists from Home...');
    try {
      const homeData = await apiService.getHome();
      const artistIds = extractArtistIds(homeData);
      
      console.log(`📊 Found ${artistIds.length} artists in Home`);
      await this.processArtists(artistIds);
    } catch (error) {
      console.error('❌ Error crawling artists from Home:', error.message);
      throw error;
    }
  }

  /**
   * Crawl artists từ Search (popular artists)
   */
  async crawlFromSearch(artistNames = ['Sơn Tùng M-TP', 'Đen Vâu', 'Jack - J97', 'AMEE', 'HIEUTHUHAI']) {
    console.log('🔄 Crawling artists from Search...');
    const allArtistIds = new Set();
    
    for (const artistName of artistNames) {
      try {
        const artistData = await apiService.getArtist(artistName);
        if (artistData.id) {
          allArtistIds.add(artistData.id);
        }
      } catch (error) {
        console.warn(`⚠️ Error getting artist "${artistName}":`, error.message);
      }
    }
    
    console.log(`📊 Found ${allArtistIds.size} artists from Search`);
    await this.processArtists(Array.from(allArtistIds));
  }

  /**
   * Crawl artists từ songs đã có trong DB
   */
  async crawlFromSongs() {
    console.log('🔄 Crawling artists from existing songs...');
    const Song = require('../../models/Song');
    
    try {
      // Lấy tất cả artistIds từ songs
      const songs = await Song.find({}, { artistIds: 1 }).limit(1000);
      const artistIds = new Set();
      
      songs.forEach(song => {
        if (song.artistIds && Array.isArray(song.artistIds)) {
          song.artistIds.forEach(id => {
            if (id) artistIds.add(id);
          });
        }
      });
      
      console.log(`📊 Found ${artistIds.size} unique artists from songs`);
      await this.processArtists(Array.from(artistIds));
    } catch (error) {
      console.error('❌ Error crawling artists from songs:', error.message);
      throw error;
    }
  }

  /**
   * Xử lý và lưu danh sách artists
   */
  async processArtists(artistIds) {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const artistId of artistIds) {
      if (this.processedArtists.has(artistId)) {
        continue;
      }

      try {
        // Tìm artist trong DB trước
        const existingArtist = await Artist.findOne({ artistId });
        
        if (existingArtist) {
          // Nếu đã có, chỉ update followerCount nếu cần
          this.processedArtists.add(artistId);
          continue;
        }

        // Nếu chưa có, cần tìm tên artist từ songs
        const Song = require('../../models/Song');
        const songWithArtist = await Song.findOne({ artistIds: artistId }).limit(1);
        
        if (!songWithArtist) {
          console.warn(`⚠️ Could not find artist info for ${artistId}`);
          continue;
        }

        // Tìm tên artist từ API search (thử một số tên phổ biến)
        let artistData = null;
        const searchKeywords = ['Sơn Tùng', 'Đen Vâu', 'Jack', 'AMEE'];
        
        for (const keyword of searchKeywords) {
          try {
            const searchData = await apiService.search(keyword);
            if (searchData.artists) {
              const found = searchData.artists.find(a => a.id === artistId);
              if (found) {
                artistData = found;
                break;
              }
            }
          } catch (error) {
            // Continue
          }
        }

        if (!artistData) {
          // Tạo artist với thông tin tối thiểu
          artistData = {
            id: artistId,
            name: `Artist ${artistId}`,
            thumbnail: null,
            totalFollow: 0,
          };
        }

        // Map và lưu
        const artistModel = mapArtistToModel(artistData);
        
        const result = await Artist.findOneAndUpdate(
          { artistId: artistModel.artistId },
          artistModel,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          saved++;
          console.log(`✅ Saved new artist: ${artistModel.name} (${artistModel.artistId})`);
        } else {
          updated++;
          console.log(`🔄 Updated artist: ${artistModel.name} (${artistModel.artistId})`);
        }

        this.processedArtists.add(artistId);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing artist ${artistId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary: ${saved} saved, ${updated} updated, ${errors} errors\n`);
  }

  /**
   * Crawl tất cả nguồn
   */
  async crawlAll() {
    console.log('🚀 Starting Artist Crawler...\n');
    
    try {
      await this.crawlFromHome();
      await this.crawlFromSearch();
      await this.crawlFromSongs();
      
      console.log('✅ Artist Crawler completed!');
    } catch (error) {
      console.error('❌ Artist Crawler failed:', error);
      throw error;
    }
  }
}

module.exports = new ArtistCrawler();

