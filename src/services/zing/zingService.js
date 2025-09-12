const { ZingMp3 } = require('zingmp3-api-full-v3');

// ===== SONG RELATED =====
// Get song info (metadata only)
async function getSongInfo(id) {
  try {
    return await ZingMp3.getInfoSong(id);
  } catch (error) {
    console.error('Error getting song info:', error);
    throw error;
  }
}

// Get streaming URL (audio link to play music)
async function getSong(id) {
  try {
    return await ZingMp3.getStreaming(id);
  } catch (error) {
    console.error('Error getting song streaming URL:', error);
    throw error;
  }
}

async function getLyric(id) {
  try {
    return await ZingMp3.getLyric(id);
  } catch (error) {
    console.error('Error getting lyric:', error);
    throw error;
  }
}

// Alias for getSong (streaming URL)
async function getStreamingUrl(id) {
  return getSong(id);
}

// ===== ARTIST RELATED =====
async function getArtist(name) {
  try {
    return await ZingMp3.getArtist(name);
  } catch (error) {
    console.error('Error getting artist:', error);
    throw error;
  }
}

async function getListArtistSong(artistId, page, count) {
  try {
    return await ZingMp3.getListArtistSong(artistId, page, count);
  } catch (error) {
    console.error('Error getting artist songs:', error);
    throw error;
  }
}

async function getListArtistPlaylist(artistId) {
  try {
    return await ZingMp3.getListArtistPlaylist(artistId);
  } catch (error) {
    console.error('Error getting artist playlists:', error);
    throw error;
  }
}

// ===== PLAYLIST RELATED =====
async function getPlaylistDetail(playlistId) {
  try {
    return await ZingMp3.getDetailPlaylist(playlistId);
  } catch (error) {
    console.error('Error getting playlist detail:', error);
    throw error;
  }
}

// Alias
async function getDetailPlaylist(id) {
  return getPlaylistDetail(id);
}

// ===== HOME & CHARTS =====
async function getHomeData() {
  try {
    return await ZingMp3.getHome();
  } catch (error) {
    console.error('Error getting home data:', error);
    throw error;
  }
}

async function getTop100() {
  try {
    return await ZingMp3.getTop100();
  } catch (error) {
    console.error('Error getting top 100:', error);
    throw error;
  }
}

async function getChartHome() {
  try {
    return await ZingMp3.getChartHome();
  } catch (error) {
    console.error('Error getting chart home:', error);
    throw error;
  }
}

async function getNewReleaseChart() {
  try {
    return await ZingMp3.getNewReleaseChart();
  } catch (error) {
    console.error('Error getting new release chart:', error);
    throw error;
  }
}

// ===== SEARCH =====
async function search(query, type = 'song') {
  try {
    if (typeof type === 'string' && type.length > 0) {
      return await ZingMp3.search(query, type);
    }
    return await ZingMp3.search(query);
  } catch (error) {
    console.error('Error searching:', error);
    throw error;
  }
}

// ===== UTILITY FUNCTIONS =====
// Get complete song info with lyric
async function getCompleteSongInfo(id) {
  try {
    const [songInfo, lyric] = await Promise.all([
      getSongInfo(id),
      getLyric(id).catch(() => null) // lyric might not be available
    ]);
    
    return {
      ...songInfo,
      lyric: lyric
    };
  } catch (error) {
    console.error('Error getting complete song info:', error);
    throw error;
  }
}

// ===== MV / VIDEO RELATED =====
async function getListMV(id, page, count) {
  try {
    return await ZingMp3.getListMV(id, page, count);
  } catch (error) {
    console.error('Error getting list MV:', error);
    throw error;
  }
}

async function getCategoryMV(id) {
  try {
    return await ZingMp3.getCategoryMV(id);
  } catch (error) {
    console.error('Error getting category MV:', error);
    throw error;
  }
}

async function getVideo(id) {
  try {
    return await ZingMp3.getVideo(id);
  } catch (error) {
    console.error('Error getting video:', error);
    throw error;
  }
}

async function suggestKeyword() {
  try {
    if (typeof ZingMp3.Suggest === 'function') {
      return await ZingMp3.Suggest();
    }
    if (typeof ZingMp3.suggestKeyword === 'function') {
      return await ZingMp3.suggestKeyword();
    }
    throw new Error('Suggest API not available in zingmp3-api-full-v3');
  } catch (error) {
    console.error('Error suggesting keyword:', error);
    throw error;
  }
}

// Cache management for streaming URLs
const streamingUrlCache = new Map();

async function getCachedStreamingUrl(songId, forceRefresh = false) {
  const cacheKey = songId;
  const cached = streamingUrlCache.get(cacheKey);
  
  // Return cached URL if still valid and not forcing refresh
  if (cached && !forceRefresh && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
    return cached.url;
  }
  
  try {
    const streamingData = await getSong(songId); // Use getSong for streaming URL
    const url = streamingData?.data?.['128'] || streamingData?.data?.['320'] || streamingData?.data?.['lossless'];
    
    if (url) {
      streamingUrlCache.set(cacheKey, {
        url,
        timestamp: Date.now()
      });
    }
    
    return url;
  } catch (error) {
    console.error('Error getting cached streaming URL:', error);
    return null;
  }
}

module.exports = {
  // Song related
  getSong,              // Get streaming URL (audio link)
  getSongInfo,          // Get song metadata (title, artist, etc.)
  getCompleteSongInfo,  // Get song info + lyric
  getLyric,
  getStreamingUrl,      // Alias for getSong
  getCachedStreamingUrl,
  
  // Artist related
  getArtist,
  getListArtistSong,
  getListArtistPlaylist,
  
  // Playlist related
  getPlaylistDetail,
  getDetailPlaylist, // alias
  
  // Home & Charts
  getHomeData,
  getTop100,
  getChartHome,
  getNewReleaseChart,
  
  // Search
  search,

  // MV / Video related
  getListMV,
  getCategoryMV,
  getVideo,
  suggestKeyword,
};



