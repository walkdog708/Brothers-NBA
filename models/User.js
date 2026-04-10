const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      default: "",
      trim: true
    },
    lastName: {
      type: String,
      default: "",
      trim: true
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },

    pushNotificationsEnabled: {
      type: Boolean,
      default: false
    },

    pushSubscription: {
      endpoint: { type: String, default: "" },
      expirationTime: { type: Date, default: null },
      keys: {
        p256dh: { type: String, default: "" },
        auth: { type: String, default: "" }
      },
      userAgent: { type: String, default: "" },
      subscribedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);