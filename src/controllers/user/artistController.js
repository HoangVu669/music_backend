const { getArtist, getListArtistSong, getListArtistPlaylist } = require('../../services/zing/zingService');
const Artist = require('../../models/Artist');
const UserFollow = require('../../models/UserFollow');
const { formatResponse } = require('../../utils/formatResponse');

// ===== GET ARTIST DETAILS =====
const getArtistDetails = async (req, res) => {
  try {
    const { artistId } = req.params;
    
    // Get artist info from Zing API
    const artistInfo = await getArtist(artistId);
    
    // Check if artist exists in our DB, if not create it
    let artist = await Artist.findOne({ artistId });
    if (!artist) {
      artist = await Artist.create({
        artistId,
        name: artistInfo.data?.name || 'Unknown',
        bio: artistInfo.data?.biography,
        thumbnail: artistInfo.data?.thumbnail
      });
    }
    
    // Check if current user is following this artist
    let isFollowing = false;
    if (req.user) {
      const follow = await UserFollow.findOne({
        userId: req.user.id,
        artistId,
        isActive: true
      });
      isFollowing = !!follow;
    }
    
    res.json(formatResponse(true, 'Artist details retrieved successfully', {
      ...artistInfo,
      localData: artist,
      isFollowing
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get artist details', null, error.message));
  }
};

// ===== GET ARTIST SONGS =====
const getArtistSongs = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const artistSongs = await getListArtistSong(artistId);
    
    res.json(formatResponse(true, 'Artist songs retrieved successfully', artistSongs));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get artist songs', null, error.message));
  }
};

// ===== GET ARTIST PLAYLISTS =====
const getArtistPlaylists = async (req, res) => {
  try {
    const { artistId } = req.params;
    
    const artistPlaylists = await getListArtistPlaylist(artistId);
    
    res.json(formatResponse(true, 'Artist playlists retrieved successfully', artistPlaylists));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get artist playlists', null, error.message));
  }
};

// ===== FOLLOW/UNFOLLOW ARTIST =====
const followArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const userId = req.user.id;
    
    // Check if user is already following this artist
    const existingFollow = await UserFollow.findOne({
      userId,
      artistId
    });
    
    if (existingFollow) {
      if (existingFollow.isActive) {
        // Unfollow the artist
        existingFollow.isActive = false;
        await existingFollow.save();
        
        // Update artist follower count
        await Artist.findOneAndUpdate(
          { artistId },
          { $inc: { followerCount: -1 } }
        );
        
        return res.json(formatResponse(true, 'Artist unfollowed successfully', { following: false }));
      } else {
        // Follow the artist again
        existingFollow.isActive = true;
        await existingFollow.save();
        
        // Update artist follower count
        await Artist.findOneAndUpdate(
          { artistId },
          { $inc: { followerCount: 1 } },
          { upsert: true }
        );
        
        return res.json(formatResponse(true, 'Artist followed successfully', { following: true }));
      }
    } else {
      // Create new follow
      await UserFollow.create({
        userId,
        artistId,
        isActive: true
      });
      
      // Update artist follower count
      await Artist.findOneAndUpdate(
        { artistId },
        { $inc: { followerCount: 1 } },
        { upsert: true }
      );
      
      return res.json(formatResponse(true, 'Artist followed successfully', { following: true }));
    }
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to follow/unfollow artist', null, error.message));
  }
};

// ===== GET USER FOLLOWED ARTISTS =====
const getFollowedArtists = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const follows = await UserFollow.find({
      userId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const artistIds = follows.map(follow => follow.artistId);
    
    // Get artist details from Zing API for each followed artist
    const artistPromises = artistIds.map(async (artistId) => {
      try {
        const artistInfo = await getArtist(artistId);
        return {
          artistId,
          ...artistInfo,
          followedAt: follows.find(f => f.artistId === artistId).createdAt
        };
      } catch (error) {
        console.error(`Error getting artist ${artistId}:`, error);
        return null;
      }
    });
    
    const artists = (await Promise.all(artistPromises)).filter(Boolean);
    
    res.json(formatResponse(true, 'Followed artists retrieved successfully', {
      artists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: follows.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get followed artists', null, error.message));
  }
};

// ===== GET POPULAR ARTISTS =====
const getPopularArtists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const artists = await Artist.find({
      isActive: true
    })
    .sort({ followerCount: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    res.json(formatResponse(true, 'Popular artists retrieved successfully', {
      artists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: artists.length
      }
    }));
  } catch (error) {
    res.status(500).json(formatResponse(false, 'Failed to get popular artists', null, error.message));
  }
};

module.exports = {
  getArtistDetails,
  getArtistSongs,
  getArtistPlaylists,
  followArtist,
  getFollowedArtists,
  getPopularArtists,
};