/**
 * Utility để map dữ liệu từ ZingMp3 API sang MongoDB Models
 */

/**
 * Validate streaming URL - phải là http/https link thực sự
 */
function isValidStreamingUrl(url) {
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
 * Map ZingMp3 Song sang MongoDB Song Model
 */
function mapSongToModel(zingSong, streamingUrl = null) {
  // Validate dữ liệu đầu vào
  if (!zingSong || !zingSong.encodeId) {
    throw new Error('Invalid song data: missing encodeId');
  }

  // Validate streamingUrl - chỉ chấp nhận http/https links
  let validStreamingUrl = null;
  if (isValidStreamingUrl(streamingUrl)) {
    validStreamingUrl = streamingUrl;
  }

  return {
    songId: zingSong.encodeId || zingSong.id,
    title: zingSong.title || '',
    artistIds: (zingSong.artists || []).map(artist => artist.id || artist.encodeId).filter(Boolean),
    artistsNames: zingSong.artistsNames || (zingSong.artists || []).map(artist => artist.name).filter(Boolean).join(', ') || 'Unknown Artist', // Thêm tên nghệ sĩ
    albumId: zingSong.album?.encodeId || zingSong.albumId || null,
    duration: zingSong.duration || 0,
    thumbnail: zingSong.thumbnail || zingSong.thumbnailM || null,
    streamingUrl: validStreamingUrl, // Chỉ lưu URL hợp lệ
    streamingUrlExpiry: validStreamingUrl ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // Expire sau 24h
    lyric: null, // Sẽ được lấy riêng
    hasLyric: zingSong.hasLyric || false,
    genres: (zingSong.genreIds || []).filter(Boolean),
    likeCount: zingSong.like || 0,
    listenCount: zingSong.listen || 0,
    commentCount: zingSong.comment || 0,
    shareCount: 0, // ZingMp3 không có share count
  };
}

/**
 * Map ZingMp3 Artist sang MongoDB Artist Model
 */
function mapArtistToModel(zingArtist) {
  return {
    artistId: zingArtist.id || zingArtist.encodeId,
    name: zingArtist.name || '',
    thumbnail: zingArtist.thumbnail || zingArtist.cover || null,
    followerCount: zingArtist.totalFollow || zingArtist.follow || 0,
  };
}

/**
 * Map ZingMp3 Album sang MongoDB Album Model
 */
function mapAlbumToModel(zingAlbum) {
  return {
    albumId: zingAlbum.encodeId || zingAlbum.id,
    title: zingAlbum.title || '',
    thumbnail: zingAlbum.thumbnail || null,
    artistIds: (zingAlbum.artists || []).map(artist => artist.id || artist.encodeId).filter(Boolean),
    songIds: [], // Sẽ được cập nhật sau
    songCount: 0, // Sẽ được cập nhật sau
    genres: zingAlbum.genreIds || [],
    likeCount: zingAlbum.like || 0,
  };
}

/**
 * Map ZingMp3 Playlist sang MongoDB Playlist Model
 */
function mapPlaylistToModel(zingPlaylist) {
  const songIds = (zingPlaylist.song?.items || []).map(song => song.encodeId || song.id).filter(Boolean);
  
  return {
    playlistId: zingPlaylist.encodeId || zingPlaylist.id || zingPlaylist.playlistId,
    title: zingPlaylist.title || '',
    thumbnail: zingPlaylist.thumbnail || null,
    description: zingPlaylist.description || zingPlaylist.sortDescription || null,
    userId: null, // Playlist từ ZingMp3 không có userId
    isPublic: true,
    songIds: songIds,
    songCount: songIds.length || zingPlaylist.song?.total || 0,
    genres: zingPlaylist.genreIds || [],
    likeCount: zingPlaylist.like || 0,
    followCount: 0,
    playCount: zingPlaylist.listen || 0,
  };
}

/**
 * Map ZingMp3 MV sang MongoDB MV Model
 */
function mapMVToModel(zingMV, videoUrl = null) {
  return {
    mvId: zingMV.encodeId || zingMV.id,
    title: zingMV.title || '',
    thumbnail: zingMV.thumbnail || zingMV.thumbnailM || null,
    videoUrl: videoUrl || null,
    artistIds: (zingMV.artists || []).map(artist => artist.id || artist.encodeId).filter(Boolean),
    songId: zingMV.songId || null,
    duration: zingMV.duration || 0,
    viewCount: 0, // ZingMp3 không có viewCount
  };
}

/**
 * Kiểm tra xem item có phải là song không
 */
function isSong(item) {
  if (!item || !item.encodeId) return false;
  
  // Songs thường có các field này:
  // - duration (số)
  // - streamingStatus
  // - isWorldWide
  // - KHÔNG có playlistId (playlists có)
  // - KHÔNG có songIds (albums có)
  
  // Nếu có duration và không phải playlist/album
  if (typeof item.duration === 'number' && 
      !item.playlistId && 
      !item.songIds && 
      !item.songCount) {
    return true;
  }
  
  // Nếu có streamingStatus (chỉ songs mới có)
  if (item.streamingStatus !== undefined) {
    return true;
  }
  
  // Nếu có isWorldWide (chỉ songs mới có)
  if (item.isWorldWide !== undefined) {
    return true;
  }
  
  return false;
}

/**
 * Extract song IDs từ các nguồn khác nhau
 * CHỈ lấy song IDs, không lấy album/playlist IDs
 */
function extractSongIds(data) {
  const songIds = new Set();
  
  // Từ home items - CHỈ lấy từ sections có songs
  if (data.items) {
    data.items.forEach(item => {
      // Chỉ lấy từ sections có songs
      const validSectionTypes = [
        'songStation',      // Song radio
        'new-release',      // New release songs
        'newReleaseChart',  // New release chart
        'RTChart',         // Real-time chart
        'weekChart',       // Week chart
      ];
      
      // Nếu sectionType là song-related
      if (validSectionTypes.includes(item.sectionType)) {
        if (item.items && Array.isArray(item.items)) {
          item.items.forEach(song => {
            if (isSong(song)) {
              songIds.add(song.encodeId);
            }
          });
        }
      }
      
      // Nếu items là array trực tiếp (như new-release)
      if (item.items && typeof item.items === 'object' && !Array.isArray(item.items)) {
        // new-release có items.all, items.vPop, items.others
        ['all', 'vPop', 'others'].forEach(key => {
          if (Array.isArray(item.items[key])) {
            item.items[key].forEach(song => {
              if (isSong(song)) {
                songIds.add(song.encodeId);
              }
            });
          }
        });
      }
    });
  }
  
  // Từ chart items (chắc chắn là songs)
  if (data.RTChart?.items) {
    data.RTChart.items.forEach(song => {
      if (song.encodeId && isSong(song)) {
        songIds.add(song.encodeId);
      }
    });
  }
  
  // Từ playlist songs (chắc chắn là songs)
  if (data.song?.items) {
    data.song.items.forEach(song => {
      if (song.encodeId && isSong(song)) {
        songIds.add(song.encodeId);
      }
    });
  }
  
  // Từ search results (chắc chắn là songs)
  if (data.songs) {
    data.songs.forEach(song => {
      if (song.encodeId && isSong(song)) {
        songIds.add(song.encodeId);
      }
    });
  }
  
  return Array.from(songIds);
}

/**
 * Extract artist IDs từ các nguồn
 */
function extractArtistIds(data) {
  const artistIds = new Set();
  
  if (data.artists) {
    data.artists.forEach(artist => {
      if (artist.id) artistIds.add(artist.id);
    });
  }
  
  if (data.items) {
    data.items.forEach(item => {
      if (item.artists) {
        item.artists.forEach(artist => {
          if (artist.id) artistIds.add(artist.id);
        });
      }
    });
  }
  
  return Array.from(artistIds);
}

module.exports = {
  mapSongToModel,
  mapArtistToModel,
  mapAlbumToModel,
  mapPlaylistToModel,
  mapMVToModel,
  extractSongIds,
  extractArtistIds,
  isSong, // Export để dùng ở các crawler khác
  isValidStreamingUrl, // Export để dùng ở các crawler khác
};

