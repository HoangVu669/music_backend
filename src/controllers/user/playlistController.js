const Playlist = require('../../models/Playlist');
const { getSongInfo } = require('../../services/zing/zingService');
const { formatResponse } = require('../../utils/formatResponse');

// ===== CREATE PLAYLIST =====
const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic = false } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json(formatResponse(false, 'Playlist name is required', null));
    }
    
    const playlist = await Playlist.create({
      name,
      description,
      userId,
      isPublic
    });
    
    res.status(201).json(formatResponse(true, 'Playlist created successfully', playlist));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to create playlist', null, error.message));
  }
};

// ===== GET USER PLAYLISTS =====
const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const playlists = await Playlist.find({
      userId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    res.json(formatResponse(true, 'Playlists retrieved successfully', {
      playlists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: playlists.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get playlists', null, error.message));
  }
};

// ===== GET PLAYLIST DETAILS =====
const getPlaylistDetails = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;
    
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId,
      isActive: true
    });
    
    if (!playlist) {
      return res.status(404).json(formatResponse(false, 'Playlist not found', null));
    }
    
    // Get song details for each song in playlist
    const songPromises = playlist.songs.map(async (songItem) => {
      try {
        const songInfo = await getSongInfo(songItem.songId);
        return {
          ...songInfo,
          addedAt: songItem.addedAt
        };
      } catch (error) {
        console.error(`Error getting song ${songItem.songId}:`, error);
        return null;
      }
    });
    
    const songs = (await Promise.all(songPromises)).filter(Boolean);
    
    res.json(formatResponse(true, 'Playlist details retrieved successfully', {
      ...playlist.toObject(),
      songs
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get playlist details', null, error.message));
  }
};

// ===== ADD SONG TO PLAYLIST =====
const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { songId } = req.body;
    const userId = req.user.id;
    
    if (!songId) {
      return res.status(400).json(formatResponse(false, 'Song ID is required', null));
    }
    
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId,
      isActive: true
    });
    
    if (!playlist) {
      return res.status(404).json(formatResponse(false, 'Playlist not found', null));
    }
    
    // Check if song already exists in playlist
    const existingSong = playlist.songs.find(song => song.songId === songId);
    if (existingSong) {
      return res.status(400).json(formatResponse(false, 'Song already exists in playlist', null));
    }
    
    // Add song to playlist
    playlist.songs.push({
      songId,
      addedAt: new Date()
    });
    
    await playlist.save();
    
    res.json(formatResponse(true, 'Song added to playlist successfully', playlist));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to add song to playlist', null, error.message));
  }
};

// ===== REMOVE SONG FROM PLAYLIST =====
const removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;
    
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId,
      isActive: true
    });
    
    if (!playlist) {
      return res.status(404).json(formatResponse(false, 'Playlist not found', null));
    }
    
    // Remove song from playlist
    playlist.songs = playlist.songs.filter(song => song.songId !== songId);
    await playlist.save();
    
    res.json(formatResponse(true, 'Song removed from playlist successfully', playlist));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to remove song from playlist', null, error.message));
  }
};

// ===== UPDATE PLAYLIST =====
const updatePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;
    
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId,
      isActive: true
    });
    
    if (!playlist) {
      return res.status(404).json(formatResponse(false, 'Playlist not found', null));
    }
    
    // Update playlist fields
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    
    await playlist.save();
    
    res.json(formatResponse(true, 'Playlist updated successfully', playlist));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to update playlist', null, error.message));
  }
};

// ===== DELETE PLAYLIST =====
const deletePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;
    
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId,
      isActive: true
    });
    
    if (!playlist) {
      return res.status(404).json(formatResponse(false, 'Playlist not found', null));
    }
    
    // Soft delete
    playlist.isActive = false;
    await playlist.save();
    
    res.json(formatResponse(true, 'Playlist deleted successfully', null));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to delete playlist', null, error.message));
  }
};

// ===== GET PUBLIC PLAYLISTS =====
const getPublicPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const playlists = await Playlist.find({
      isPublic: true,
      isActive: true
    })
    .populate('userId', 'username profile.displayName')
    .sort({ likeCount: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    res.json(formatResponse(true, 'Public playlists retrieved successfully', {
      playlists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: playlists.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get public playlists', null, error.message));
  }
};

module.exports = {
  createPlaylist,
  getUserPlaylists,
  getPlaylistDetails,
  addSongToPlaylist,
  removeSongFromPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPublicPlaylists,
};