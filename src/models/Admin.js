const mongoose = require("mongoose");

/**
 * Admin Model - Quản lý admin cho web dashboard
 * TÁCH RIÊNG với User model để:
 * - Bảo mật tốt hơn (tách biệt credentials)
 * - Clear separation of concerns
 * - Performance tốt hơn
 * - Scale dễ dàng hơn
 */
const AdminSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "super_admin"],
      default: "admin",
      index: true,
    },
    profile: {
      displayName: { type: String },
      avatar: { type: String },
    },
    permissions: [
      {
        resource: {
          type: String,
          required: true,
        },
        actions: [{ type: String }],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    createdBy: { type: String, index: true },
  },
  {
    timestamps: true,
    collection: "admins",
  }
);

// Text index với default_language để tránh lỗi language override
AdminSchema.index({ username: "text", email: "text" }, { default_language: "none" });
AdminSchema.index({ role: 1, isActive: 1 });
AdminSchema.index({ lastLoginAt: -1 });
AdminSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Admin", AdminSchema);
