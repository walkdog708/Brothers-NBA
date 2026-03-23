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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);