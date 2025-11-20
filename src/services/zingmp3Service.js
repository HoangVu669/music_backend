/**
 * ZingMp3 Service - Call trực tiếp ZingMp3 API (internal)
 * Sử dụng zingmp3-api-full-v3 library thay vì HTTP external
 */
const { ZingMp3 } = require('zingmp3-api-full-v3');

class ZingMp3Service {
  /**
   * Call ZingMp3 API (internal - direct library call)
   */
  async callAPI(endpoint, params = {}) {
    try {
      let data;
      
      switch (endpoint) {
        case '/api/home':
          data = await ZingMp3.getHome();
          break;
        case '/api/top100':
          data = await ZingMp3.getTop100();
          break;
        case '/api/charthome':
          data = await ZingMp3.getChartHome();
          break;
        case '/api/newreleasechart':
          data = await ZingMp3.getNewReleaseChart();
          break;
        case '/api/song':
          data = await ZingMp3.getSong(params.id);
          break;
        case '/api/infosong':
          data = await ZingMp3.getInfoSong(params.id);
          break;
        case '/api/lyric':
          data = await ZingMp3.getLyric(params.id);
          break;
        case '/api/search':
          data = await ZingMp3.search(params.keyword);
          break;
        case '/api/artist':
          data = await ZingMp3.getArtist(params.name);
          break;
        case '/api/artistsong':
          data = await ZingMp3.getListArtistSong(params.id, params.page || 1, params.count || 20);
          break;
        case '/api/detailplaylist':
          data = await ZingMp3.getDetailPlaylist(params.id);
          break;
        case '/api/listmv':
          data = await ZingMp3.getListMV(params.id, params.page || 1, params.count || 20);
          break;
        case '/api/categorymv':
          data = await ZingMp3.getCategoryMV(params.id);
          break;
        case '/api/video':
          data = await ZingMp3.getVideo(params.id);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      // ZingMp3 library trả về format { err, msg, data }
      if (data && data.err === 0) {
        return data.data;
      } else {
        throw new Error(data?.msg || 'ZingMp3 API Error');
      }
    } catch (error) {
      throw new Error(`ZingMp3 API Error: ${error.message}`);
    }
  }

  /**
   * Lấy streaming URL của bài hát (128kbps)
   * QUAN TRỌNG: Luôn call fresh, không cache
   */
  async getStreamingUrl(songId) {
    const streamData = await this.callAPI('/api/song', { id: songId });
    
    // Luôn lấy 128kbps (không lấy 320 vì có thể là "VIP")
    const streamingUrl = streamData['128'];
    
    if (!streamingUrl || !streamingUrl.startsWith('http')) {
      throw new Error('Invalid streaming URL from ZingMp3');
    }
    
    return streamingUrl;
  }

  /**
   * Lấy thông tin bài hát
   */
  async getSongInfo(songId) {
    return this.callAPI('/api/infosong', { id: songId });
  }

  /**
   * Lấy lời bài hát
   */
  async getLyric(songId) {
    return this.callAPI('/api/lyric', { id: songId });
  }

  /**
   * Tìm kiếm
   */
  async search(keyword, type = 'all') {
    return this.callAPI('/api/search', { keyword });
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
   * Lấy chi tiết album (album cũng là playlist trong ZingMp3)
   */
  async getAlbumDetail(albumId) {
    return this.callAPI('/api/detailplaylist', { id: albumId });
  }

  /**
   * Lấy dữ liệu trang chủ
   */
  async getHome() {
    return this.callAPI('/api/home');
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
   * Lấy danh sách MV
   */
  async getListMV(id, page = 1, count = 20) {
    return this.callAPI('/api/listmv', { id, page, count });
  }

  /**
   * Lấy danh mục MV
   */
  async getCategoryMV(id) {
    return this.callAPI('/api/categorymv', { id });
  }

  /**
   * Lấy link video
   */
  async getVideo(id) {
    return this.callAPI('/api/video', { id });
  }

  /**
   * Lấy từ khóa gợi ý
   */
  async getSuggestKeyword() {
    const { ZingMp3 } = require('zingmp3-api-full-v3');
    try {
      const data = await ZingMp3.Suggest();
      if (data && data.err === 0) {
        return data.data;
      } else {
        throw new Error(data?.msg || 'ZingMp3 API Error');
      }
    } catch (error) {
      throw new Error(`ZingMp3 API Error: ${error.message}`);
    }
  }
}

module.exports = new ZingMp3Service();

