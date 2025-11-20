const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_STATUS, GENDER } = require("./Enum");
const {
  generateUniqueRandomId,
  generateActivationCode,
} = require("../utils/generateId");

/**
 * User Model - Quản lý user cho mobile app
 * TÁCH RIÊNG với Admin model
 * Học từ e-commerce: có id (number), methods, pre-save hooks
 */
const UserSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING_VERIFICATION,
      index: true,
    },
    fullname: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      lowercase: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: Object.values(GENDER),
    },
    phone: {
      type: String,
      trim: true,
    },
    activationCode: {
      type: String,
      default: function () {
        return generateActivationCode();
      },
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// ===== PRE-SAVE HOOKS =====
UserSchema.pre("save", async function (next) {
  // Generate unique ID for new documents
  if (this.isNew && !this.id) {
    this.id = await generateUniqueRandomId(this.constructor, "id");
  }

  // Hash password if modified
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ===== INSTANCE METHODS =====
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.generateActivationCode = function () {
  this.activationCode = generateActivationCode();
  return this.activationCode;
};

UserSchema.methods.isLocked = function () {
  return this.status === USER_STATUS.LOCKED;
};

UserSchema.methods.isActive = function () {
  return this.status === USER_STATUS.ACTIVE;
};

// ===== INDEXES =====
UserSchema.index({ username: "text", email: "text", fullname: "text" });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);
