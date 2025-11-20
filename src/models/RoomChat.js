const mongoose = require("mongoose");

/**
 * RoomChat Model - Tin nhắn chat trong phòng nghe nhạc
 * Chức năng: Chat real-time giữa members trong room
 */
const RoomChatSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userAvatar: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ["TEXT", "EMOJI", "STICKER", "SONG_SUGGESTION", "SYSTEM"],
      default: "TEXT",
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      // For SONG_SUGGESTION: { songId, songTitle, artistName }
      // For STICKER: { stickerId, stickerUrl }
      type: mongoose.Schema.Types.Mixed,
    },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId },
      userName: { type: String },
      content: { type: String, maxlength: 100 },
    },
    reactions: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "room_chats",
  }
);

RoomChatSchema.index({ roomId: 1, createdAt: -1 });
RoomChatSchema.index({ userId: 1, roomId: 1 });
RoomChatSchema.index({ messageType: 1 });

// Soft delete message
RoomChatSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("RoomChat", RoomChatSchema);

