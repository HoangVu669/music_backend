/**
 * Crawler cho Albums
 * Lấy dữ liệu album từ ZingMp3 API và lưu vào MongoDB
 */
const Album = require('../../models/Album');
const Song = require('../../models/Song');
const apiService = require('../services/apiService');
const { mapAlbumToModel } = require('../utils/dataMapper');

class AlbumCrawler {
  constructor() {
    this.processedAlbums = new Set();
  }

  /**
   * Crawl albums từ songs đã có trong DB
   */
  async crawlFromSongs() {
    console.log('🔄 Crawling albums from existing songs...');
    
    try {
      // Lấy tất cả albumIds từ songs
      const songs = await Song.find({ albumId: { $ne: null } }, { albumId: 1 }).limit(1000);
      const albumIds = new Set();
      
      songs.forEach(song => {
        if (song.albumId) {
          albumIds.add(song.albumId);
        }
      });
      
      console.log(`📊 Found ${albumIds.size} unique albums from songs`);
      await this.processAlbums(Array.from(albumIds));
    } catch (error) {
      console.error('❌ Error crawling albums from songs:', error.message);
      throw error;
    }
  }

  /**
   * Crawl albums từ Artist pages
   */
  async crawlFromArtists() {
    console.log('🔄 Crawling albums from artists...');
    const Artist = require('../../models/Artist');
    
    try {
      // Lấy một số artists phổ biến
      const artists = await Artist.find().limit(20);
      const allAlbumIds = new Set();
      
      for (const artist of artists) {
        try {
          // Lấy thông tin artist từ API để có sections (albums)
          const searchData = await apiService.search(artist.name);
          
          if (searchData.artists && searchData.artists.length > 0) {
            const artistInfo = searchData.artists[0];
            // Albums thường nằm trong sections của artist detail page
            // Nhưng API search không trả về albums, nên skip
          }
        } catch (error) {
          console.warn(`⚠️ Error getting albums for artist ${artist.name}:`, error.message);
        }
      }
      
      console.log(`📊 Found ${allAlbumIds.size} albums from artists`);
      if (allAlbumIds.size > 0) {
        await this.processAlbums(Array.from(allAlbumIds));
      }
    } catch (error) {
      console.error('❌ Error crawling albums from artists:', error.message);
      throw error;
    }
  }

  /**
   * Xử lý và lưu danh sách albums
   */
  async processAlbums(albumIds) {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const albumId of albumIds) {
      if (this.processedAlbums.has(albumId)) {
        continue;
      }

      try {
        // Lấy thông tin album từ songs
        const songs = await Song.find({ albumId });
        
        if (songs.length === 0) {
          console.warn(`⚠️ No songs found for album ${albumId}`);
          continue;
        }

        // Lấy thông tin từ song đầu tiên
        const firstSong = songs[0];
        const songInfo = await apiService.getSongInfo(firstSong.songId);
        
        if (!songInfo.album) {
          console.warn(`⚠️ No album info for ${albumId}`);
          continue;
        }

        // Map dữ liệu
        const albumData = mapAlbumToModel(songInfo.album);
        albumData.songIds = songs.map(s => s.songId);
        albumData.songCount = songs.length;

        // Lưu vào MongoDB
        const result = await Album.findOneAndUpdate(
          { albumId: albumData.albumId },
          albumData,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          saved++;
          console.log(`✅ Saved new album: ${albumData.title} (${albumData.albumId})`);
        } else {
          // Update songIds và songCount
          await Album.updateOne(
            { albumId: albumData.albumId },
            { 
              $set: { 
                songIds: albumData.songIds,
                songCount: albumData.songCount 
              } 
            }
          );
          updated++;
          console.log(`🔄 Updated album: ${albumData.title} (${albumData.albumId})`);
        }

        this.processedAlbums.add(albumId);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing album ${albumId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary: ${saved} saved, ${updated} updated, ${errors} errors\n`);
  }

  /**
   * Crawl tất cả nguồn
   */
  async crawlAll() {
    console.log('🚀 Starting Album Crawler...\n');
    
    try {
      await this.crawlFromSongs();
      await this.crawlFromArtists();
      
      console.log('✅ Album Crawler completed!');
    } catch (error) {
      console.error('❌ Album Crawler failed:', error);
      throw error;
    }
  }
}

module.exports = new AlbumCrawler();

