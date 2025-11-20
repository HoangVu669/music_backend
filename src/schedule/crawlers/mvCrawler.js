/**
 * Crawler cho MVs
 * Lấy dữ liệu MV từ ZingMp3 API và lưu vào MongoDB
 */
const MV = require('../../models/MV');
const apiService = require('../services/apiService');
const { mapMVToModel } = require('../utils/dataMapper');

class MVCrawler {
  constructor() {
    this.processedMVs = new Set();
  }

  /**
   * Crawl MVs từ Search
   */
  async crawlFromSearch(keywords = ['MV', 'Music Video', 'Video Clip']) {
    console.log('🔄 Crawling MVs from Search...');
    const allMVIds = new Set();
    
    for (const keyword of keywords) {
      try {
        const searchData = await apiService.search(keyword);
        
        if (searchData.videos) {
          searchData.videos.slice(0, 20).forEach(video => {
            if (video.encodeId) {
              allMVIds.add(video.encodeId);
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error searching MVs for "${keyword}":`, error.message);
      }
    }
    
    console.log(`📊 Found ${allMVIds.size} unique MVs from Search`);
    await this.processMVs(Array.from(allMVIds));
  }

  /**
   * Crawl MVs từ Artists
   */
  async crawlFromArtists() {
    console.log('🔄 Crawling MVs from artists...');
    const Artist = require('../../models/Artist');
    
    try {
      // Lấy một số artists phổ biến
      const artists = await Artist.find().limit(10);
      const allMVIds = new Set();
      
      for (const artist of artists) {
        try {
          // Lấy danh sách MV của artist
          const mvList = await apiService.getListMV(artist.artistId, 1, 20);
          
          if (mvList.items) {
            mvList.items.forEach(mv => {
              if (mv.encodeId) {
                allMVIds.add(mv.encodeId);
              }
            });
          }
        } catch (error) {
          console.warn(`⚠️ Error getting MVs for artist ${artist.name}:`, error.message);
        }
      }
      
      console.log(`📊 Found ${allMVIds.size} MVs from artists`);
      if (allMVIds.size > 0) {
        await this.processMVs(Array.from(allMVIds));
      }
    } catch (error) {
      console.error('❌ Error crawling MVs from artists:', error.message);
      throw error;
    }
  }

  /**
   * Xử lý và lưu danh sách MVs
   */
  async processMVs(mvIds) {
    let saved = 0;
    let updated = 0;
    let errors = 0;

    for (const mvId of mvIds) {
      if (this.processedMVs.has(mvId)) {
        continue;
      }

      try {
        // Lấy link video
        let videoUrl = null;
        try {
          const videoData = await apiService.getVideo(mvId);
          videoUrl = videoData['720p'] || videoData['480p'] || videoData['360p'] || Object.values(videoData)[0];
        } catch (error) {
          console.warn(`⚠️ Could not get video URL for ${mvId}`);
        }

        // Tìm thông tin MV từ search
        let mvInfo = null;
        try {
          const searchData = await apiService.search('MV');
          if (searchData.videos) {
            mvInfo = searchData.videos.find(v => v.encodeId === mvId);
          }
        } catch (error) {
          // Continue
        }

        if (!mvInfo) {
          // Tạo MV với thông tin tối thiểu
          mvInfo = {
            encodeId: mvId,
            title: `MV ${mvId}`,
            thumbnail: null,
            artists: [],
            songId: null,
            duration: 0,
          };
        }

        // Map dữ liệu
        const mvModel = mapMVToModel(mvInfo, videoUrl);

        // Lưu vào MongoDB
        const result = await MV.findOneAndUpdate(
          { mvId: mvModel.mvId },
          mvModel,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          saved++;
          console.log(`✅ Saved new MV: ${mvModel.title} (${mvModel.mvId})`);
        } else {
          updated++;
          console.log(`🔄 Updated MV: ${mvModel.title} (${mvModel.mvId})`);
        }

        this.processedMVs.add(mvId);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing MV ${mvId}:`, error.message);
      }
    }

    console.log(`\n📈 Summary: ${saved} saved, ${updated} updated, ${errors} errors\n`);
  }

  /**
   * Crawl tất cả nguồn
   */
  async crawlAll() {
    console.log('🚀 Starting MV Crawler...\n');
    
    try {
      await this.crawlFromSearch();
      await this.crawlFromArtists();
      
      console.log('✅ MV Crawler completed!');
    } catch (error) {
      console.error('❌ MV Crawler failed:', error);
      throw error;
    }
  }
}

module.exports = new MVCrawler();

