/**
 * Service để gọi ZingMp3 API
 */
const axios = require('axios');
const config = require('../config');

class ApiService {
  constructor() {
    this.baseURL = config.ZING_API_BASE_URL;
    this.delay = config.CRAWLER.REQUEST_DELAY;
    this.timeout = config.CRAWLER.REQUEST_TIMEOUT;
  }

  /**
   * Delay giữa các request
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gọi API với retry
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @param {number} retries - Số lần retry
   * @param {boolean} skipNotFound - Skip ngay nếu lỗi "not found" (không retry)
   */
  async callAPI(endpoint, params = {}, retries = config.CRAWLER.MAX_RETRIES, skipNotFound = false) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.sleep(this.delay);
        
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          params,
          timeout: this.timeout,
        });

        if (response.data && response.data.err === 0) {
          return response.data.data;
        } else {
          const errorMsg = response.data?.msg || 'API Error';
          
          // Nếu là lỗi "not found" và skipNotFound = true, throw ngay (không retry)
          if (skipNotFound && (
            errorMsg.includes('Không tìm thấy') || 
            errorMsg.includes('not found') ||
            errorMsg.includes('Not Found') ||
            response.data.err === -1
          )) {
            throw new Error(errorMsg);
          }
          
          throw new Error(errorMsg);
        }
      } catch (error) {
        // Nếu là lỗi "not found" và skipNotFound = true, throw ngay
        if (skipNotFound && (
          error.message.includes('Không tìm thấy') || 
          error.message.includes('not found') ||
          error.message.includes('Not Found')
        )) {
          throw error;
        }
        
        // Nếu là lỗi network/timeout, retry
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          if (i === retries - 1) {
            console.error(`API Network Error after ${retries} retries:`, error.message);
            throw error;
          }
          console.warn(`Retry ${i + 1}/${retries} for ${endpoint} (network error)`);
          await this.sleep(this.delay * (i + 1)); // Exponential backoff
          continue;
        }
        
        // Các lỗi khác, throw ngay
        if (i === retries - 1) {
          throw error;
        }
        console.warn(`Retry ${i + 1}/${retries} for ${endpoint}`);
        await this.sleep(this.delay * (i + 1));
      }
    }
  }

  /**
   * Lấy dữ liệu trang chủ
   */
  async getHome() {
    return this.callAPI('/api/home');
  }

  /**
   * Lấy thông tin bài hát
   * @param {string} songId - Song ID
   * @param {boolean} skipNotFound - Skip ngay nếu không tìm thấy (không retry)
   */
  async getSongInfo(songId, skipNotFound = true) {
    return this.callAPI('/api/infosong', { id: songId }, config.CRAWLER.MAX_RETRIES, skipNotFound);
  }

  /**
   * Lấy link streaming bài hát
   * @param {string} songId - Song ID
   * @param {boolean} skipNotFound - Skip ngay nếu không tìm thấy (không retry)
   */
  async getSongStream(songId, skipNotFound = true) {
    return this.callAPI('/api/song', { id: songId }, config.CRAWLER.MAX_RETRIES, skipNotFound);
  }

  /**
   * Lấy lời bài hát
   */
  async getLyric(songId) {
    return this.callAPI('/api/lyric', { id: songId });
  }

  /**
   * Lấy Top 100
   */
  async getTop100() {
    return this.callAPI('/api/top100');
  }

  /**
   * Lấy Chart Home
   */
  async getChartHome() {
    return this.callAPI('/api/charthome');
  }

  /**
   * Lấy New Release Chart
   */
  async getNewReleaseChart() {
    return this.callAPI('/api/newreleasechart');
  }

  /**
   * Lấy thông tin nghệ sĩ
   */
  async getArtist(artistName) {
    return this.callAPI('/api/artist', { name: artistName });
  }

  /**
   * Lấy danh sách bài hát của nghệ sĩ
   */
  async getArtistSongs(artistId, page = 1, count = 20) {
    return this.callAPI('/api/artistsong', { id: artistId, page, count });
  }

  /**
   * Lấy chi tiết playlist
   */
  async getPlaylistDetail(playlistId) {
    return this.callAPI('/api/detailplaylist', { id: playlistId });
  }

  /**
   * Tìm kiếm
   */
  async search(keyword) {
    return this.callAPI('/api/search', { keyword });
  }

  /**
   * Lấy danh sách MV
   */
  async getListMV(id, page = 1, count = 20) {
    return this.callAPI('/api/listmv', { id, page, count });
  }

  /**
   * Lấy link video
   */
  async getVideo(videoId) {
    return this.callAPI('/api/video', { id: videoId });
  }
}

module.exports = new ApiService();

