const mongoose = require("mongoose");

/**
 * Configuration Model - Cấu hình hệ thống
 * Chức năng: Admin quản lý settings app (feature flags, limits, etc.)
 */
const ConfigurationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "GENERAL",
        "PLAYBACK",
        "SUBSCRIPTION",
        "SOCIAL",
        "ROOM",
        "RECOMMENDATION",
        "NOTIFICATION",
        "LIMITS",
        "FEATURES",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dataType: {
      type: String,
      enum: ["STRING", "NUMBER", "BOOLEAN", "JSON", "ARRAY"],
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false, // true = client có thể access, false = server-only
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    validationRules: {
      min: { type: Number },
      max: { type: Number },
      allowedValues: [{ type: mongoose.Schema.Types.Mixed }],
      regex: { type: String },
    },
    lastModifiedBy: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "configurations",
  }
);

ConfigurationSchema.index({ category: 1, isPublic: 1 });
ConfigurationSchema.index({ key: 1 }, { unique: true });

// Get config value by key
ConfigurationSchema.statics.getValue = async function (key, defaultValue = null) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

// Set config value by key
ConfigurationSchema.statics.setValue = async function (key, value, modifiedBy) {
  return this.findOneAndUpdate(
    { key },
    { value, lastModifiedBy: modifiedBy, updatedAt: new Date() },
    { new: true, upsert: false }
  );
};

// Get all configs by category
ConfigurationSchema.statics.getByCategory = function (category, publicOnly = false) {
  const query = { category };
  if (publicOnly) {
    query.isPublic = true;
  }
  return this.find(query);
};

module.exports = mongoose.model("Configuration", ConfigurationSchema);

