const mongoose = require("mongoose");

/**
 * DashboardStats Model - Thống kê tổng quan cho admin dashboard
 * Chức năng: Cache metrics để dashboard load nhanh
 */
const DashboardStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
      default: "DAILY",
      index: true,
    },
    users: {
      totalUsers: { type: Number, default: 0 },
      newUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      freeUsers: { type: Number, default: 0 },
      vipUsers: { type: Number, default: 0 },
      lockedUsers: { type: Number, default: 0 },
    },
    playback: {
      totalPlays: { type: Number, default: 0 },
      totalPlayTime: { type: Number, default: 0 }, // in seconds
      uniqueSongsPlayed: { type: Number, default: 0 },
      averageSessionDuration: { type: Number, default: 0 },
    },
    social: {
      totalLikes: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      totalShares: { type: Number, default: 0 },
      totalFollows: { type: Number, default: 0 },
    },
    rooms: {
      totalRooms: { type: Number, default: 0 },
      activeRooms: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
    },
    content: {
      totalSongs: { type: Number, default: 0 },
      totalPlaylists: { type: Number, default: 0 },
      totalArtists: { type: Number, default: 0 },
      totalAlbums: { type: Number, default: 0 },
    },
    reports: {
      totalReports: { type: Number, default: 0 },
      pendingReports: { type: Number, default: 0 },
      resolvedReports: { type: Number, default: 0 },
    },
    topSongs: [
      {
        songId: { type: String },
        title: { type: String },
        artistName: { type: String },
        playCount: { type: Number },
        likeCount: { type: Number },
      },
    ],
    topArtists: [
      {
        artistId: { type: String },
        name: { type: String },
        followCount: { type: Number },
        totalPlays: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
    collection: "dashboard_stats",
  }
);

DashboardStatsSchema.index({ date: -1, period: 1 });
DashboardStatsSchema.index({ period: 1, createdAt: -1 });

// Get stats for a date range
DashboardStatsSchema.statics.getStatsForRange = function (startDate, endDate, period = "DAILY") {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    period,
  }).sort({ date: 1 });
};

// Get latest stats
DashboardStatsSchema.statics.getLatest = function (period = "DAILY") {
  return this.findOne({ period }).sort({ date: -1 });
};

module.exports = mongoose.model("DashboardStats", DashboardStatsSchema);

