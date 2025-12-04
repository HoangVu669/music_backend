const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: { type: String },

    hostId: { type: String, required: true, index: true }, // JQBX-style: hostId
    ownerId: { type: String, required: true, index: true }, // Legacy field
    ownerName: { type: String },

    members: [
      {
        userId: {
          type: String,
          required: true,
        },
        userName: { type: String },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    memberCount: {
      type: Number,
      default: 1,
      index: true,
    },
    // Pending join requests (for private rooms)
    pendingRequests: [
      {
        userId: {
          type: String,
          required: true,
        },
        userName: { type: String },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // JQBX-style currentTrack structure
    currentTrack: {
      zingId: { type: String, index: true },
      title: { type: String },
      artist: { type: String },
      artists: { type: String }, // Alternative field name
      thumbnail: { type: String },
      duration: { type: Number, default: 0 },
      startedAt: { type: Number, default: 0 }, // Timestamp when track started playing
      position: { type: Number, default: 0 }, // Current position in seconds
      streamingUrl: { type: String }, // Cached streaming URL
      isPlaying: { type: Boolean, default: false }, // Track playing state
      djUserId: { type: String }, // DJ who queued this track (DJ Rotation mode)
      queuedBy: { type: String }, // User who queued this track
      mode: { type: String, enum: ['normal', 'rotation'], default: 'normal' }, // Track mode
    },
    // Legacy fields (kept for backward compatibility)
    currentSongId: { type: String, index: true },
    currentPosition: {
      type: Number,
      default: 0,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: {
      type: Date,
      default: Date.now,
    },

    // JQBX-style settings
    settings: {
      autoplay: { type: Boolean, default: true },
      allowMemberSkip: { type: Boolean, default: false },
      allowMemberAddTrack: { type: Boolean, default: true },
      strictSync: { type: Boolean, default: true }, // Enable strict synchronization
    },

    queue: [
      {
        zingId: { type: String }, // JQBX-style: use zingId (optional for backward compatibility)
        songId: { type: String }, // Legacy field for backward compatibility
        title: { type: String },
        artist: { type: String },
        thumbnail: { type: String },
        duration: { type: Number, default: 0 },
        addedBy: { type: String },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        order: { type: Number },
      },
    ],

    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublic: { type: Boolean, default: true, index: true }, // JQBX-style: isPublic (opposite of isPrivate)
    maxMembers: {
      type: Number,
      default: 50,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ===== ROOM MODES (JQBX-style) =====
    // Mode: 'normal' (host mode) | 'coop' (cooperative mode) | 'dj_rotation' (DJ rotation mode)
    mode: {
      type: String,
      enum: ['normal', 'coop', 'dj_rotation'],
      default: 'normal',
      index: true,
    },

    // DJ Rotation: Danh sách DJs
    djs: [
      {
        userId: { type: String, required: true },
        userName: { type: String },
        order: { type: Number, default: 0 }, // Explicit order for rotation
        trackQueue: [
          {
            zingId: { type: String, required: true },
            title: { type: String },
            artist: { type: String },
            thumbnail: { type: String },
            duration: { type: Number, default: 0 },
            streamingUrl: { type: String },
            addedAt: { type: Date, default: Date.now },
          },
        ],
        nextTrackIndex: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        joinedAt: { type: Date, default: Date.now },
        lastActiveAt: { type: Date, default: Date.now }, // Last activity (queue add/remove)
        idleSince: { type: Date }, // When DJ became idle (no queue activity)
      },
    ],
    // DJ Rotation: Waitlist (users waiting to join when slots full)
    djWaitlist: [
      {
        userId: { type: String, required: true },
        userName: { type: String },
        requestedAt: { type: Date, default: Date.now },
      },
    ],

    // DJ Rotation: Index của DJ đang phát
    currentDjIndex: {
      type: Number,
      default: -1, // -1 = không có DJ nào đang phát
    },

    // DJ Rotation: Settings
    rotationSettings: {
      maxDjSlots: { type: Number, default: 10 },
      allowGuestsToJoinDJ: { type: Boolean, default: true },
      autoAdvanceDJ: { type: Boolean, default: true }, // Tự động chuyển DJ khi bài kết thúc
      strictSync: { type: Boolean, default: true },
      allowAutoplayFallback: { type: Boolean, default: true }, // Allow autoplay when all DJs empty
      idleTimeout: { type: Number, default: 10 * 60 * 1000 }, // 10 minutes - auto-kick idle DJs
    },

    // ===== VOTE SKIP SYSTEM (JQBX-style) =====
    voteSkips: [
      {
        userId: { type: String, required: true },
        userName: { type: String },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    voteSkipThreshold: {
      type: Number,
      default: 0.5, // 50% members cần vote để skip
    },
    voteSkipEnabled: {
      type: Boolean,
      default: true,
    },

    // ===== DJ ORDER (for reordering) =====
    djOrder: [{ type: String }], // Array of userIds để track thứ tự DJ
  },
  {
    timestamps: true,
    collection: "rooms",
  }
);

// Pre-save hook: đảm bảo hostId = ownerId nếu chưa có (backward compatibility)
RoomSchema.pre('save', function (next) {
  if (!this.hostId && this.ownerId) {
    this.hostId = this.ownerId;
  }
  if (this.isPublic === undefined) {
    this.isPublic = !this.isPrivate;
  }
  // Đảm bảo currentTrack có structure đúng
  if (!this.currentTrack || !this.currentTrack.zingId) {
    if (this.currentSongId) {
      // Migrate từ legacy fields
      this.currentTrack = {
        zingId: this.currentSongId,
        title: null,
        artist: null,
        thumbnail: null,
        duration: 0,
        startedAt: 0,
        position: this.currentPosition || 0,
        streamingUrl: null,
      };
    }
  }
  // Đảm bảo queue items có zingId
  if (this.queue && Array.isArray(this.queue)) {
    this.queue.forEach(item => {
      if (!item.zingId && item.songId) {
        item.zingId = item.songId;
      }
    });
  }
  // Đảm bảo DJ rotation fields có giá trị mặc định
  if (this.mode === 'dj_rotation') {
    if (!this.djs || !Array.isArray(this.djs)) {
      this.djs = [];
    }
    if (this.currentDjIndex === undefined || this.currentDjIndex === null) {
      this.currentDjIndex = -1;
    }
    if (!this.rotationSettings) {
      this.rotationSettings = {
        maxDjSlots: 10,
        allowGuestsToJoinDJ: true,
        autoAdvanceDJ: true,
        strictSync: true,
        allowAutoplayFallback: true,
        idleTimeout: 10 * 60 * 1000,
      };
    }
    // Đảm bảo djOrder sync với djs
    if (!this.djOrder || !Array.isArray(this.djOrder)) {
      this.djOrder = this.djs.filter(dj => dj.isActive).map(dj => String(dj.userId));
    }
    // Đảm bảo DJ fields có giá trị mặc định
    this.djs.forEach((dj, index) => {
      if (dj.order === undefined || dj.order === null) {
        dj.order = index;
      }
      if (!dj.lastActiveAt) {
        dj.lastActiveAt = dj.joinedAt || new Date();
      }
    });
    // Đảm bảo waitlist exists
    if (!this.djWaitlist || !Array.isArray(this.djWaitlist)) {
      this.djWaitlist = [];
    }
  }
  // Đảm bảo vote skip fields có giá trị mặc định
  if (this.voteSkipThreshold === undefined || this.voteSkipThreshold === null) {
    this.voteSkipThreshold = 0.5;
  }
  if (this.voteSkipEnabled === undefined || this.voteSkipEnabled === null) {
    this.voteSkipEnabled = true;
  }
  if (!this.voteSkips || !Array.isArray(this.voteSkips)) {
    this.voteSkips = [];
  }
  next();
});

RoomSchema.index({ ownerId: 1, isActive: 1 });
RoomSchema.index({ hostId: 1, isActive: 1 });
RoomSchema.index({ "members.userId": 1 });
RoomSchema.index({ isPrivate: 1, isActive: 1 });
RoomSchema.index({ memberCount: -1 });
RoomSchema.index({ mode: 1, isActive: 1 });
RoomSchema.index({ "djs.userId": 1 });

module.exports = mongoose.model("Room", RoomSchema);
