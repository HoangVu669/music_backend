const Group = require('../../models/Group');
const Song = require('../../models/Song');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

class UserGroupController {
  // GET /groups
  async getGroups(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Build filter
      const filter = { 
        isActive: true, 
        'settings.isPublic': true 
      };
      
      if (search) {
        filter.$text = { $search: search };
      }

      const groups = await Group.find(filter)
        .populate('owner', 'fullName avatar')
        .populate('currentSong.song', 'title duration coverImage artist')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);

      const total = await Group.countDocuments(filter);

      res.json({
        success: true,
        data: {
          groups,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /groups/my
  async getMyGroups(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const groups = await Group.find({
        $or: [
          { owner: userId },
          { 'members.user': userId, 'members.isActive': true }
        ],
        isActive: true
      })
      .populate('owner', 'fullName avatar')
      .populate('currentSong.song', 'title duration coverImage artist')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

      const total = await Group.countDocuments({
        $or: [
          { owner: userId },
          { 'members.user': userId, 'members.isActive': true }
        ],
        isActive: true
      });

      res.json({
        success: true,
        data: {
          groups,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get my groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // GET /groups/{id}
  async getGroupById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const group = await Group.findById(id)
        .populate('owner', 'fullName avatar')
        .populate('members.user', 'fullName avatar')
        .populate('currentSong.song', 'title duration coverImage artist')
        .populate('queue.song', 'title duration coverImage artist')
        .populate('queue.addedBy', 'fullName avatar')
        .populate('chat.user', 'fullName avatar');

      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user can view this group
      const isOwner = group.owner._id.toString() === userId;
      const isMember = group.members.some(
        member => member.user._id.toString() === userId && member.isActive
      );

      if (!group.settings.isPublic && !isOwner && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      console.error('Get group by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups
  async createGroup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        name, 
        description, 
        isPublic = true, 
        maxMembers = 50,
        allowMemberAddSongs = true,
        allowMemberSkip = true,
        requireApproval = false
      } = req.body;
      const userId = req.user.userId;

      const group = new Group({
        name,
        description,
        owner: userId,
        settings: {
          isPublic,
          maxMembers,
          allowMemberAddSongs,
          allowMemberSkip,
          requireApproval
        }
      });

      // Add owner as first member
      await group.addMember(userId, 'admin');
      await group.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.totalGroups': 1 }
      });

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: group
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/join
  async joinGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if group is public or user is invited
      if (!group.settings.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Group is private'
        });
      }

      // Check if already a member
      const existingMember = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Already a member of this group'
        });
      }

      // Add member
      await group.addMember(userId);
      await group.save();

      res.json({
        success: true,
        message: 'Joined group successfully'
      });
    } catch (error) {
      console.error('Join group error:', error);
      if (error.message === 'Group is full') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/leave
  async leaveGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user is owner
      if (group.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Group owner cannot leave. Transfer ownership or delete group.'
        });
      }

      // Check if user is a member
      const member = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'Not a member of this group'
        });
      }

      // Remove member
      await group.removeMember(userId);
      await group.save();

      res.json({
        success: true,
        message: 'Left group successfully'
      });
    } catch (error) {
      console.error('Leave group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/play
  async playSong(req, res) {
    try {
      const { id } = req.params;
      const { songId } = req.body;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user is a member
      const member = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Not a member of this group'
        });
      }

      // Check if song exists
      const song = await Song.findById(songId);
      if (!song || !song.isPublic || !song.isApproved) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Update current song
      group.currentSong = {
        song: songId,
        startedAt: new Date(),
        position: 0,
        isPlaying: true,
        playedBy: userId
      };

      await group.save();

      res.json({
        success: true,
        message: 'Song started playing',
        data: group.currentSong
      });
    } catch (error) {
      console.error('Play song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/pause
  async pauseSong(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user is a member
      const member = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Not a member of this group'
        });
      }

      // Pause current song
      if (group.currentSong && group.currentSong.isPlaying) {
        group.currentSong.isPlaying = false;
        await group.save();
      }

      res.json({
        success: true,
        message: 'Song paused'
      });
    } catch (error) {
      console.error('Pause song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/skip
  async skipSong(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user is a member
      const member = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Not a member of this group'
        });
      }

      // Check if user can skip
      const isOwner = group.owner.toString() === userId;
      const isModerator = member.role === 'moderator' || member.role === 'admin';
      const canSkip = isOwner || isModerator || group.settings.allowMemberSkip;

      if (!canSkip) {
        return res.status(403).json({
          success: false,
          message: 'Not allowed to skip songs'
        });
      }

      // Skip to next song
      await group.skipSong();
      await group.save();

      res.json({
        success: true,
        message: 'Song skipped',
        data: group.currentSong
      });
    } catch (error) {
      console.error('Skip song error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // POST /groups/{id}/chat
  async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const userId = req.user.userId;

      const group = await Group.findById(id);
      if (!group || !group.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check if user is a member
      const member = group.members.find(
        member => member.user.toString() === userId && member.isActive
      );

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Not a member of this group'
        });
      }

      // Send message
      await group.sendMessage(userId, message);
      await group.save();

      res.json({
        success: true,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserGroupController();
