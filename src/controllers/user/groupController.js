const ListeningGroup = require('../../models/ListeningGroup');
const { formatResponse } = require('../../utils/formatResponse');
const { getSongInfo } = require('../../services/zing/zingService');

/**
 * Create a new listening group
 */
const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, settings = {} } = req.body;

    if (!name) {
      return res.status(400).json(formatResponse(false, 'Group name is required', null));
    }

    // Create new group
    const group = new ListeningGroup({
      name,
      description,
      hostId: userId,
      settings: {
        isPublic: settings.isPublic !== undefined ? settings.isPublic : true,
        maxMembers: settings.maxMembers || 50,
        allowMembersAddSongs: settings.allowMembersAddSongs !== undefined ? settings.allowMembersAddSongs : true,
        allowMembersSkip: settings.allowMembersSkip !== undefined ? settings.allowMembersSkip : true,
        autoPlay: settings.autoPlay !== undefined ? settings.autoPlay : true
      }
    });

    // Add host as first member
    await group.addMember(userId, 'host');
    await group.save();

    res.status(201).json(formatResponse(true, 'Group created successfully', {
      group: group,
      groupId: group._id
    }));

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json(formatResponse(false, 'Failed to create group', null, error.message));
  }
};

/**
 * Get all public groups
 */
const getPublicGroups = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query = { 
      isActive: true, 
      'settings.isPublic': true 
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const groups = await ListeningGroup.find(query)
      .populate('hostId', 'username')
      .populate('members.userId', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ListeningGroup.countDocuments(query);

    res.json(formatResponse(true, 'Public groups retrieved successfully', {
      groups: groups.map(group => ({
        _id: group._id,
        name: group.name,
        description: group.description,
        hostId: group.hostId,
        memberCount: group.getActiveMembers().length,
        currentSong: group.currentSong,
        settings: group.settings,
        createdAt: group.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    }));

  } catch (error) {
    console.error('Error getting public groups:', error);
    res.status(500).json(formatResponse(false, 'Failed to get public groups', null, error.message));
  }
};

/**
 * Get user's groups (hosted and joined)
 */
const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all' } = req.query; // all, hosted, joined

    let query = { isActive: true };

    switch (type) {
      case 'hosted':
        query.hostId = userId;
        break;
      case 'joined':
        query['members.userId'] = userId;
        query.hostId = { $ne: userId };
        break;
      default:
        query.$or = [
          { hostId: userId },
          { 'members.userId': userId }
        ];
    }

    const groups = await ListeningGroup.find(query)
      .populate('hostId', 'username')
      .populate('members.userId', 'username')
      .sort({ updatedAt: -1 });

    res.json(formatResponse(true, 'User groups retrieved successfully', {
      groups: groups.map(group => ({
        _id: group._id,
        name: group.name,
        description: group.description,
        hostId: group.hostId,
        memberCount: group.getActiveMembers().length,
        currentSong: group.currentSong,
        settings: group.settings,
        userRole: group.members.find(m => m.userId.toString() === userId)?.role,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }))
    }));

  } catch (error) {
    console.error('Error getting user groups:', error);
    res.status(500).json(formatResponse(false, 'Failed to get user groups', null, error.message));
  }
};

/**
 * Get group details
 */
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId)
      .populate('hostId', 'username')
      .populate('members.userId', 'username')
      .populate('queue.addedBy', 'username');

    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    if (!group.isActive) {
      return res.status(404).json(formatResponse(false, 'Group is not active', null));
    }

    // Check if user is member or group is public
    const isMember = group.isMember(userId);
    const isPublic = group.settings.isPublic;

    if (!isMember && !isPublic) {
      return res.status(403).json(formatResponse(false, 'Access denied', null));
    }

    res.json(formatResponse(true, 'Group details retrieved successfully', {
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        hostId: group.hostId,
        members: group.getActiveMembers(),
        currentSong: group.currentSong,
        queue: group.queue,
        settings: group.settings,
        chat: group.chat.slice(-50), // Last 50 messages
        userRole: group.members.find(m => m.userId.toString() === userId)?.role,
        isMember: isMember,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    }));

  } catch (error) {
    console.error('Error getting group details:', error);
    res.status(500).json(formatResponse(false, 'Failed to get group details', null, error.message));
  }
};

/**
 * Join a group
 */
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    if (!group.isActive) {
      return res.status(404).json(formatResponse(false, 'Group is not active', null));
    }

    if (!group.settings.isPublic) {
      return res.status(403).json(formatResponse(false, 'Group is private', null));
    }

    // Check if group is full
    const activeMembers = group.getActiveMembers();
    if (activeMembers.length >= group.settings.maxMembers) {
      return res.status(400).json(formatResponse(false, 'Group is full', null));
    }

    // Check if already a member
    if (group.isMember(userId)) {
      return res.status(400).json(formatResponse(false, 'Already a member of this group', null));
    }

    // Add user to group
    await group.addMember(userId);

    res.json(formatResponse(true, 'Joined group successfully', {
      groupId: group._id,
      groupName: group.name
    }));

  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json(formatResponse(false, 'Failed to join group', null, error.message));
  }
};

/**
 * Leave a group
 */
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    // Check if user is a member
    if (!group.isMember(userId)) {
      return res.status(400).json(formatResponse(false, 'Not a member of this group', null));
    }

    // Check if user is the host
    if (group.hostId.toString() === userId) {
      return res.status(400).json(formatResponse(false, 'Host cannot leave group. Transfer ownership or delete group instead.', null));
    }

    // Remove user from group
    await group.removeMember(userId);

    res.json(formatResponse(true, 'Left group successfully', {
      groupId: group._id,
      groupName: group.name
    }));

  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json(formatResponse(false, 'Failed to leave group', null, error.message));
  }
};

/**
 * Update group settings
 */
const updateGroupSettings = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { name, description, settings } = req.body;

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    // Check if user is the host
    if (group.hostId.toString() !== userId) {
      return res.status(403).json(formatResponse(false, 'Only host can update group settings', null));
    }

    // Update group
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (settings) {
      group.settings = { ...group.settings, ...settings };
    }

    await group.save();

    res.json(formatResponse(true, 'Group settings updated successfully', {
      group: group
    }));

  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json(formatResponse(false, 'Failed to update group settings', null, error.message));
  }
};

/**
 * Delete a group
 */
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    // Check if user is the host
    if (group.hostId.toString() !== userId) {
      return res.status(403).json(formatResponse(false, 'Only host can delete group', null));
    }

    // Deactivate group
    group.isActive = false;
    group.endedAt = new Date();
    await group.save();

    res.json(formatResponse(true, 'Group deleted successfully', {
      groupId: group._id
    }));

  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json(formatResponse(false, 'Failed to delete group', null, error.message));
  }
};

/**
 * Add song to group queue
 */
const addSongToQueue = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json(formatResponse(false, 'Song ID is required', null));
    }

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    if (!group.isMember(userId)) {
      return res.status(403).json(formatResponse(false, 'Not a member of this group', null));
    }

    if (!group.canModifyQueue(userId)) {
      return res.status(403).json(formatResponse(false, 'Not allowed to add songs to queue', null));
    }

    // Get song info from Zing API
    const { getSongInfo } = require('../../services/zing/zingService');
    const songInfo = await getSongInfo(songId);

    if (!songInfo.data) {
      return res.status(404).json(formatResponse(false, 'Song not found', null));
    }

    const songData = {
      songId: songId,
      title: songInfo.data.title,
      artist: songInfo.data.artistsNames,
      thumbnail: songInfo.data.thumbnail,
      duration: songInfo.data.duration
    };

    // Add song to queue
    await group.addSongToQueue(songData, userId);

    res.json(formatResponse(true, 'Song added to queue successfully', {
      song: songData,
      queueLength: group.queue.length
    }));

  } catch (error) {
    console.error('Error adding song to queue:', error);
    res.status(500).json(formatResponse(false, 'Failed to add song to queue', null, error.message));
  }
};

/**
 * Remove song from group queue
 */
const removeSongFromQueue = async (req, res) => {
  try {
    const { groupId, songIndex } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId);
    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    if (!group.isMember(userId)) {
      return res.status(403).json(formatResponse(false, 'Not a member of this group', null));
    }

    if (!group.canModifyQueue(userId)) {
      return res.status(403).json(formatResponse(false, 'Not allowed to remove songs from queue', null));
    }

    const songIndexNum = parseInt(songIndex);
    if (songIndexNum < 0 || songIndexNum >= group.queue.length) {
      return res.status(400).json(formatResponse(false, 'Invalid song index', null));
    }

    const removedSong = group.queue[songIndexNum];
    await group.removeSongFromQueue(songIndexNum);

    res.json(formatResponse(true, 'Song removed from queue successfully', {
      removedSong: removedSong,
      queueLength: group.queue.length
    }));

  } catch (error) {
    console.error('Error removing song from queue:', error);
    res.status(500).json(formatResponse(false, 'Failed to remove song from queue', null, error.message));
  }
};

/**
 * Get group queue
 */
const getGroupQueue = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await ListeningGroup.findById(groupId)
      .populate('queue.addedBy', 'username');

    if (!group) {
      return res.status(404).json(formatResponse(false, 'Group not found', null));
    }

    if (!group.isMember(userId) && !group.settings.isPublic) {
      return res.status(403).json(formatResponse(false, 'Access denied', null));
    }

    res.json(formatResponse(true, 'Group queue retrieved successfully', {
      currentSong: group.currentSong,
      queue: group.queue,
      queueLength: group.queue.length
    }));

  } catch (error) {
    console.error('Error getting group queue:', error);
    res.status(500).json(formatResponse(false, 'Failed to get group queue', null, error.message));
  }
};

module.exports = {
  createGroup,
  getPublicGroups,
  getUserGroups,
  getGroupDetails,
  joinGroup,
  leaveGroup,
  updateGroupSettings,
  deleteGroup,
  addSongToQueue,
  removeSongFromQueue,
  getGroupQueue
};
