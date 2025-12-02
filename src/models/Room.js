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

    ownerId: {
      type: String,
      required: true,
      index: true,
    },
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

    queue: [
      {
        songId: {
          type: String,
          required: true,
        },
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
    maxMembers: {
      type: Number,
      default: 50,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "rooms",
  }
);

RoomSchema.index({ ownerId: 1, isActive: 1 });
RoomSchema.index({ "members.userId": 1 });
RoomSchema.index({ isPrivate: 1, isActive: 1 });
RoomSchema.index({ memberCount: -1 });

module.exports = mongoose.model("Room", RoomSchema);
