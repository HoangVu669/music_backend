const Song = require('../models/Song');
const Artist = require('../models/Artist');
const { getSongInfo, getArtist } = require('./zing/zingService');

// ===== SONG CACHE MANAGEMENT =====
const cacheSongData = async (songId) => {
  try {
    // Check if song already exists and is recently synced
    const existingSong = await Song.findOne({ songId });
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (existingSong && existingSong.lastSynced > oneHourAgo) {
      return existingSong;
    }
    
    // Get fresh data from Zing API
    const songInfo = await getSongInfo(songId);
    
    if (!songInfo.data) {
      throw new Error('Song not found in Zing API');
    }
    
    const songData = {
      songId,
      title: songInfo.data.title || 'Unknown',
      artist: songInfo.data.artistsNames || 'Unknown',
      artistId: songInfo.data.artists?.[0]?.id,
      album: songInfo.data.album?.title,
      albumId: songInfo.data.album?.id,
      duration: songInfo.data.duration,
      thumbnail: songInfo.data.thumbnail,
      lastSynced: now
    };
    
    if (existingSong) {
      // Update existing song
      Object.assign(existingSong, songData);
      await existingSong.save();
      return existingSong;
    } else {
      // Create new song
      const newSong = await Song.create(songData);
      return newSong;
    }
  } catch (error) {
    console.error('Error caching song data:', error);
    throw error;
  }
};

// ===== ARTIST CACHE MANAGEMENT =====
const cacheArtistData = async (artistId) => {
  try {
    // Check if artist already exists and is recently synced
    const existingArtist = await Artist.findOne({ artistId });
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    if (existingArtist && existingArtist.lastSynced > oneDayAgo) {
      return existingArtist;
    }
    
    // Get fresh data from Zing API
    const artistInfo = await getArtist(artistId);
    
    if (!artistInfo.data) {
      throw new Error('Artist not found in Zing API');
    }
    
    const artistData = {
      artistId,
      name: artistInfo.data.name || 'Unknown',
      bio: artistInfo.data.biography,
      thumbnail: artistInfo.data.thumbnail,
      lastSynced: now
    };
    
    if (existingArtist) {
      // Update existing artist
      Object.assign(existingArtist, artistData);
      await existingArtist.save();
      return existingArtist;
    } else {
      // Create new artist
      const newArtist = await Artist.create(artistData);
      return newArtist;
    }
  } catch (error) {
    console.error('Error caching artist data:', error);
    throw error;
  }
};

// ===== BULK CACHE OPERATIONS =====
const cacheMultipleSongs = async (songIds) => {
  const results = [];
  const errors = [];
  
  for (const songId of songIds) {
    try {
      const song = await cacheSongData(songId);
      results.push(song);
    } catch (error) {
      errors.push({ songId, error: error.message });
    }
  }
  
  return { results, errors };
};

const cacheMultipleArtists = async (artistIds) => {
  const results = [];
  const errors = [];
  
  for (const artistId of artistIds) {
    try {
      const artist = await cacheArtistData(artistId);
      results.push(artist);
    } catch (error) {
      errors.push({ artistId, error: error.message });
    }
  }
  
  return { results, errors };
};

// ===== CACHE CLEANUP =====
const cleanupOldCache = async () => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Remove old inactive songs
    const deletedSongs = await Song.deleteMany({
      isActive: false,
      updatedAt: { $lt: oneWeekAgo }
    });
    
    // Remove old inactive artists
    const deletedArtists = await Artist.deleteMany({
      isActive: false,
      updatedAt: { $lt: oneWeekAgo }
    });
    
    console.log(`Cache cleanup completed: ${deletedSongs.deletedCount} songs, ${deletedArtists.deletedCount} artists removed`);
    
    return {
      deletedSongs: deletedSongs.deletedCount,
      deletedArtists: deletedArtists.deletedCount
    };
  } catch (error) {
    console.error('Error during cache cleanup:', error);
    throw error;
  }
};

// ===== CACHE STATISTICS =====
const getCacheStats = async () => {
  try {
    const songCount = await Song.countDocuments({ isActive: true });
    const artistCount = await Artist.countDocuments({ isActive: true });
    
    const recentSongs = await Song.countDocuments({
      isActive: true,
      lastSynced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const recentArtists = await Artist.countDocuments({
      isActive: true,
      lastSynced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    return {
      songs: {
        total: songCount,
        recentlySynced: recentSongs
      },
      artists: {
        total: artistCount,
        recentlySynced: recentArtists
      }
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    throw error;
  }
};

module.exports = {
  cacheSongData,
  cacheArtistData,
  cacheMultipleSongs,
  cacheMultipleArtists,
  cleanupOldCache,
  getCacheStats,
};
