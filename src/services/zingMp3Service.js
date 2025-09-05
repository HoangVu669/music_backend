const { ZingMp3 } = require("zingmp3-api-full-v3");

class ZingMp3Service {
    // Lấy thông tin bài hát
    async getSong(songId) {
        try {
            const data = await ZingMp3.getSong(songId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy thông tin playlist
    async getDetailPlaylist(playlistId) {
        try {
            const data = await ZingMp3.getDetailPlaylist(playlistId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy trang chủ
    async getHome() {
        try {
            const data = await ZingMp3.getHome();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy top 100
    async getTop100() {
        try {
            const data = await ZingMp3.getTop100();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy bảng xếp hạng trang chủ
    async getChartHome() {
        try {
            const data = await ZingMp3.getChartHome();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy bảng xếp hạng phát hành mới
    async getNewReleaseChart() {
        try {
            const data = await ZingMp3.getNewReleaseChart();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy thông tin chi tiết bài hát
    async getInfo(songId) {
        try {
            const data = await ZingMp3.getInfoSong(songId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy thông tin nghệ sĩ
    async getArtist(artistName) {
        try {
            const data = await ZingMp3.getArtist(artistName);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy danh sách bài hát của nghệ sĩ
    async getArtistSong(artistId, page = 1, count = 20) {
        try {
            const data = await ZingMp3.getListArtistSong(artistId, page, count);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy lời bài hát
    async getLyric(songId) {
        try {
            const data = await ZingMp3.getLyric(songId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Tìm kiếm
    async search(keyword) {
        try {
            const data = await ZingMp3.search(keyword);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy danh sách MV
    async getListMV(artistId, page = 1, count = 20) {
        try {
            const data = await ZingMp3.getListMV(artistId, page, count);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy danh mục MV
    async getCategoryMV(categoryId) {
        try {
            const data = await ZingMp3.getCategoryMV(categoryId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy video
    async getVideo(videoId) {
        try {
            const data = await ZingMp3.getVideo(videoId);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Lấy gợi ý từ khóa
    async getSuggestKeyword() {
        try {
            const data = await ZingMp3.Suggest();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ZingMp3Service(); 