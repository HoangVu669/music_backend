const mongoose = require("mongoose");

/**
 * RoomInvitation Model - Lời mời vào phòng nghe nhạc
 * Chức năng: User mời bạn bè vào phòng listening party
 */
const RoomInvitationSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    inviterId: {
      type: String,
      required: true,
      index: true,
    },
    inviterName: {
      type: String,
      required: true,
    },
    inviteeId: {
      type: String,
      required: true,
      index: true,
    },
    inviteeName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    message: {
      type: String,
      maxlength: 200,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "room_invitations",
  }
);

RoomInvitationSchema.index({ inviteeId: 1, status: 1 });
RoomInvitationSchema.index({ roomId: 1, status: 1 });
RoomInvitationSchema.index({ expiresAt: 1 });

// Check if invitation is expired
RoomInvitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() && this.status === "PENDING";
};

// Accept invitation
RoomInvitationSchema.methods.accept = function () {
  this.status = "ACCEPTED";
  this.respondedAt = new Date();
  return this.save();
};

// Reject invitation
RoomInvitationSchema.methods.reject = function () {
  this.status = "REJECTED";
  this.respondedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("RoomInvitation", RoomInvitationSchema);

