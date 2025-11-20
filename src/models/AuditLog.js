const mongoose = require("mongoose");

/**
 * AuditLog Model - Log chi tiết hành động admin
 * Chức năng: Theo dõi mọi thay đổi admin thực hiện (compliance, security)
 */
const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      index: true,
    },
    adminUsername: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "LOCK_USER",
        "UNLOCK_USER",
        "APPROVE_SONG",
        "REJECT_SONG",
        "DELETE_COMMENT",
        "RESOLVE_REPORT",
        "CHANGE_CONFIG",
        "GRANT_PERMISSION",
        "REVOKE_PERMISSION",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    resource: {
      type: String,
      enum: [
        "USER",
        "ADMIN",
        "SONG",
        "PLAYLIST",
        "ALBUM",
        "ARTIST",
        "COMMENT",
        "REPORT",
        "BANNER",
        "CONFIGURATION",
        "PACKAGE",
        "TRANSACTION",
        "ROOM",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      apiEndpoint: { type: String },
      requestMethod: { type: String },
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  }
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, resource: 1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ resourceId: 1, resource: 1 });
AuditLogSchema.index({ createdAt: -1 });

// Static method to create audit log
AuditLogSchema.statics.createLog = function (data) {
  return this.create({
    adminId: data.adminId,
    adminUsername: data.adminUsername,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId || null,
    description: data.description,
    changes: data.changes || null,
    metadata: data.metadata || {},
    severity: data.severity || "LOW",
    status: data.status || "SUCCESS",
    errorMessage: data.errorMessage || null,
  });
};

module.exports = mongoose.model("AuditLog", AuditLogSchema);

