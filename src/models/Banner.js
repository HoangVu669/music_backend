const mongoose = require("mongoose");

/**
 * Banner Model - Banner quảng cáo/khuyến mãi trong app
 * Chức năng: Admin quản lý banner hiển thị trên Home, Search, etc.
 */
const BannerSchema = new mongoose.Schema(
  {
    bannerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageMobileUrl: {
      type: String, // Optional mobile-specific image
    },
    bannerType: {
      type: String,
      enum: ["PROMOTION", "NEW_RELEASE", "EVENT", "PLAYLIST", "ARTIST", "PACKAGE", "ANNOUNCEMENT"],
      required: true,
      index: true,
    },
    position: {
      type: String,
      enum: ["HOME_TOP", "HOME_MIDDLE", "SEARCH_TOP", "LIBRARY_TOP", "PROFILE_TOP"],
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ["NONE", "OPEN_URL", "OPEN_PLAYLIST", "OPEN_ALBUM", "OPEN_ARTIST", "OPEN_PACKAGE", "PLAY_SONG"],
      default: "NONE",
    },
    actionValue: {
      type: String, // URL, playlistId, albumId, artistId, packageId, songId
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ["ALL", "NEW_USERS", "ACTIVE_USERS"],
      default: "ALL",
      index: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    impressionCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "banners",
  }
);

BannerSchema.index({ position: 1, isActive: 1, startDate: 1, endDate: 1 });
BannerSchema.index({ displayOrder: 1 });
BannerSchema.index({ bannerType: 1 });

// Check if banner is currently active
BannerSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
};

// Increment click count
BannerSchema.methods.incrementClick = function () {
  this.clickCount += 1;
  return this.save();
};

// Increment impression count
BannerSchema.methods.incrementImpression = function () {
  this.impressionCount += 1;
  return this.save();
};

module.exports = mongoose.model("Banner", BannerSchema);

