const { 
  getHomeData, 
  getTop100, 
  getChartHome, 
  getNewReleaseChart,
  getSongInfo,
  getCompleteSongInfo,
  getLyric,
  getCachedStreamingUrl,
  search
} = require('../../services/zing/zingService');
const Song = require('../../models/Song');
const UserInteraction = require('../../models/UserInteraction');
const { formatResponse } = require('../../utils/formatResponse');

// ===== HOME & CHARTS =====
const getHome = async (req, res) => {
  try {
    const homeData = await getHomeData();
    res.json(formatResponse(true, 'Home data retrieved successfully', homeData));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get home data', null, error.message));
  }
};

const getTop100Songs = async (req, res) => {
  try {
    const top100 = await getTop100();
    res.json(formatResponse(true, 'Top 100 songs retrieved successfully', top100));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get top 100 songs', null, error.message));
  }
};

const getChartHomeData = async (req, res) => {
  try {
    const chartData = await getChartHome();
    res.json(formatResponse(true, 'Chart home data retrieved successfully', chartData));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get chart home data', null, error.message));
  }
};

const getNewReleaseChartData = async (req, res) => {
  try {
    const newReleaseData = await getNewReleaseChart();
    res.json(formatResponse(true, 'New release chart data retrieved successfully', newReleaseData));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get new release chart data', null, error.message));
  }
};

// ===== SONG DETAILS =====

const getSongInfoOnly = async (req, res) => {
  try {
    const { songId } = req.params;
    
    // Get only song metadata (no lyric)
    const songInfo = await getSongInfo(songId);
    
    // Check if song exists in our DB, if not create it
    let song = await Song.findOne({ songId });
    if (!song) {
      song = await Song.create({
        songId,
        title: songInfo.data?.title || 'Unknown',
        artist: songInfo.data?.artistsNames || 'Unknown',
        artistId: songInfo.data?.artists?.[0]?.id,
        album: songInfo.data?.album?.title,
        albumId: songInfo.data?.album?.id,
        duration: songInfo.data?.duration,
        thumbnail: songInfo.data?.thumbnail
      });
    }
    
    res.json(formatResponse(true, 'Song info retrieved successfully', {
      ...songInfo,
      localData: song
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get song info', null, error.message));
  }
};

const getSongLyricOnly = async (req, res) => {
  try {
    const { songId } = req.params;
    
    const lyric = await getLyric(songId);
    
    res.json(formatResponse(true, 'Song lyric retrieved successfully', lyric));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get song lyric', null, error.message));
  }
};

const getStreamingUrl = async (req, res) => {
  try {
    const { songId } = req.params;
    const { forceRefresh } = req.query;
    
    const streamingUrl = await getCachedStreamingUrl(songId, forceRefresh === 'true');
    
    if (!streamingUrl) {
      return res.status(404).json(formatResponse(false, 'Streaming URL not available', null));
    }
    
    res.json(formatResponse(true, 'Streaming URL retrieved successfully', { streamingUrl }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get streaming URL', null, error.message));
  }
};

// ===== SEARCH =====
const searchMusic = async (req, res) => {
  try {
    const { q, type = 'song' } = req.query;
    
    if (!q) {
      return res.status(400).json(formatResponse(false, 'Search query is required', null));
    }
    
    const searchResults = await search(q, type);
    res.json(formatResponse(true, 'Search completed successfully', searchResults));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Search failed', null, error.message));
  }
};

// ===== USER INTERACTIONS =====
const likeSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;
    
    // Check if user already liked this song
    const existingInteraction = await UserInteraction.findOne({
      userId,
      songId,
      action: 'like'
    });
    
    if (existingInteraction) {
      return res.status(400).json(formatResponse(false, 'Song already liked', { liked: true }));
    }
    
    // Like the song
    await UserInteraction.create({
      userId,
      songId,
      action: 'like'
    });
    
    await Song.findOneAndUpdate(
      { songId },
      { $inc: { likeCount: 1 } },
      { upsert: true }
    );
    
    return res.json(formatResponse(true, 'Song liked successfully', { liked: true }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to like song', null, error.message));
  }
};

const unlikeSong = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;
    
    // Check if user has liked this song
    const existingInteraction = await UserInteraction.findOne({
      userId,
      songId,
      action: 'like'
    });
    
    if (!existingInteraction) {
      return res.status(400).json(formatResponse(false, 'Song not liked yet', { liked: false }));
    }
    
    // Unlike the song
    await UserInteraction.deleteOne({ _id: existingInteraction._id });
    await Song.findOneAndUpdate(
      { songId },
      { $inc: { likeCount: -1 } }
    );
    
    return res.json(formatResponse(true, 'Song unliked successfully', { liked: false }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to unlike song', null, error.message));
  }
};

const getUserLikedSongs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const interactions = await UserInteraction.find({
      userId,
      action: 'like'
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    // Filter out invalid songIds and log them
    const validInteractions = interactions.filter(interaction => {
      if (!interaction.songId || interaction.songId === 'liked' || interaction.songId.length < 3) {
        console.warn(`Invalid songId found: ${interaction.songId}, removing from results`);
        return false;
      }
      return true;
    });
    
    const songIds = validInteractions.map(interaction => interaction.songId);
    
    if (songIds.length === 0) {
      return res.json(formatResponse(true, 'No liked songs found', {
        songs: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        }
      }));
    }
    
    // Get song details from Zing API for each liked song
    const songPromises = songIds.map(async (songId) => {
      try {
        const songInfo = await getSongInfo(songId);
        return {
          songId,
          ...songInfo,
          likedAt: validInteractions.find(i => i.songId === songId).createdAt
        };
      } catch (error) {
        console.error(`Error getting song ${songId}:`, error);
        return null;
      }
    });
    
    const songs = (await Promise.all(songPromises)).filter(Boolean);
    
    res.json(formatResponse(true, 'Liked songs retrieved successfully', {
      songs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: validInteractions.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get liked songs', null, error.message));
  }
};

module.exports = {
  // Home & Charts
  getHome,
  getTop100Songs,
  getChartHomeData,
  getNewReleaseChartData,
  
  // Song Details
  getSongInfoOnly,
  getSongLyricOnly,
  getStreamingUrl,
  
  // Search
  searchMusic,
  
  // User Interactions
  likeSong,
  unlikeSong,
  getUserLikedSongs,
};
