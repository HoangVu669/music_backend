/**
 * Zing Service - Chuyên biệt cho Room/Group Listening
 * Wrapper around zingmp3Service với các hàm chuyên biệt cho JQBX-style room
 */
const zingmp3Service = require('./zingmp3Service');
const jqbxConfig = require('../config/jqbx');

// In-memory cache for metadata
const metadataCache = new Map();

class ZingService {
    /**
     * Lấy thông tin bài hát từ ZingMP3 (metadata)
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Song info với title, artist, thumbnail, duration
     */
    async getSongInfo(zingId) {
        // Check cache
        const cacheKey = `songInfo:${zingId}`;
        const cached = metadataCache.get(cacheKey);
        if (cached && Date.now() < cached.timestamp + jqbxConfig.zing.cacheTTL) {
            return cached.data;
        }

        // Retry logic
        let lastError = null;
        for (let attempt = 0; attempt < jqbxConfig.zing.retryAttempts; attempt++) {
            try {
                const songInfo = await zingmp3Service.getSongInfo(zingId);

                // Format theo JQBX structure
                const formatted = {
                    zingId: zingId,
                    title: songInfo.title || '',
                    artist: songInfo.artistsNames || songInfo.artists?.map(a => a.name).join(', ') || '',
                    thumbnail: songInfo.thumbnail || songInfo.thumbnailM || '',
                    duration: songInfo.duration || 0,
                    // Giữ thêm metadata gốc nếu cần
                    rawData: songInfo,
                };

                // Cache result
                metadataCache.set(cacheKey, {
                    data: formatted,
                    timestamp: Date.now(),
                });

                return formatted;
            } catch (error) {
                lastError = error;
                if (attempt < jqbxConfig.zing.retryAttempts - 1) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, jqbxConfig.zing.retryDelay * (attempt + 1)));
                }
            }
        }

        throw new Error(`Failed to get song info for ${zingId} after ${jqbxConfig.zing.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Lấy streaming URL của bài hát
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<string>} Streaming URL
     */
    async getStreamingUrl(zingId) {
        try {
            const streamingUrl = await zingmp3Service.getStreamingUrl(zingId);
            return streamingUrl;
        } catch (error) {
            throw new Error(`Failed to get streaming URL for ${zingId}: ${error.message}`);
        }
    }

    /**
     * Lấy lời bài hát
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Lyric data
     */
    async getLyric(zingId) {
        try {
            const lyricData = await zingmp3Service.getLyric(zingId);
            return lyricData;
        } catch (error) {
            // Return empty lyric if error (không throw để không block)
            return { lyric: null, hasLyric: false };
        }
    }

    /**
     * Lấy thông tin bài hát đầy đủ (info + streaming URL)
     * Dùng khi host đổi bài hoặc queue add track
     * @param {string} zingId - ZingMP3 song ID
     * @returns {Promise<Object>} Full song data với streaming URL
     */
    async getFullSongData(zingId) {
        try {
            const [songInfo, streamingUrl] = await Promise.all([
                this.getSongInfo(zingId),
                this.getStreamingUrl(zingId).catch(() => null), // Không throw nếu streaming URL lỗi
            ]);

            return {
                ...songInfo,
                streamingUrl,
            };
        } catch (error) {
            throw new Error(`Failed to get full song data for ${zingId}: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách bài hát liên quan (cho autoplay)
     * @param {string} currentZingId - ZingMP3 song ID hiện tại
     * @returns {Promise<Array<Object>>} Array of related songs
     */
    async getRelatedSongs(currentZingId) {
        try {
            // Lấy thông tin bài hát hiện tại
            const currentSong = await this.getSongInfo(currentZingId);
            if (!currentSong) {
                return [];
            }

            // Tìm kiếm theo artist hoặc title để lấy bài liên quan
            const searchKeyword = currentSong.artist || currentSong.title || '';
            if (!searchKeyword) {
                return [];
            }

            const searchResults = await zingmp3Service.search(searchKeyword);
            const songs = searchResults?.songs || [];

            // Lọc bỏ bài hiện tại và format
            const relatedSongs = songs
                .filter(song => {
                    const songId = song.encodeId || song.id;
                    return songId && songId !== currentZingId;
                })
                .slice(0, 20); // Limit to 20 songs

            // Format và lấy full data cho một số bài
            const formattedSongs = [];
            for (const song of relatedSongs.slice(0, 10)) { // Get full data for top 10
                try {
                    const songId = song.encodeId || song.id;
                    const fullData = await this.getFullSongData(songId);
                    formattedSongs.push(fullData);
                } catch (error) {
                    // Skip if error
                    continue;
                }
            }

            return formattedSongs;
        } catch (error) {
            console.error(`Failed to get related songs for ${currentZingId}:`, error.message);
            return [];
        }
    }

    /**
     * Lấy bài hát random liên quan (cho autoplay) - wrapper cho getRelatedSongs
     * @param {string} currentZingId - ZingMP3 song ID hiện tại
     * @returns {Promise<Object|null>} Random related song hoặc null
     */
    async getRandomRelatedSong(currentZingId) {
        try {
            // Sử dụng getRelatedSongs và random một bài
            const relatedSongs = await this.getRelatedSongs(currentZingId);
            if (relatedSongs.length === 0) {
                return null;
            }

            // Random một bài từ danh sách
            const randomSong = relatedSongs[Math.floor(Math.random() * relatedSongs.length)];
            return randomSong;
        } catch (error) {
            console.error(`Failed to get random related song for ${currentZingId}:`, error.message);
            return null;
        }
    }
}

module.exports = new ZingService();

