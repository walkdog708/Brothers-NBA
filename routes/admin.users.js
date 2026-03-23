const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../models/User");

function requireAdmin(req, res, next) {
  if (req.session?.user?.isAdmin) return next();
  return res.status(403).json({ success: false, error: "Admin access required." });
}

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select("username firstName lastName email isAdmin isActive mustChangePassword createdAt")
      .sort({ username: 1 })
      .lean();

    return res.json({ success: true, users });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return res.status(500).json({ success: false, error: "Failed to load users." });
  }
});

router.post("/users", requireAdmin, async (req, res) => {
  try {
    const {
      username,
      password,
      firstName = "",
      lastName = "",
      email = "",
      isAdmin = false
    } = req.body || {};

    const normalizedUsername = String(username || "").trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedUsername) {
      return res.status(400).json({ success: false, error: "Username is required." });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: "Temporary password is required." });
    }

    const existingUser = await User.findOne({ username: normalizedUsername }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      username: normalizedUsername,
      passwordHash,
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      email: normalizedEmail,
      isAdmin: !!isAdmin,
      isActive: true,
      mustChangePassword: true
    });

    return res.json({
      success: true,
      message: `Created user ${user.username}.`,
      user: {
        _id: user._id,
        username: user.username
      }
    });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return res.status(500).json({ success: false, error: "Failed to create user." });
  }
});

router.patch("/users/:id/status", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid user id." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `${user.username} is now ${user.isActive ? "active" : "inactive"}.`,
      isActive: user.isActive
    });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id/status error:", err);
    return res.status(500).json({ success: false, error: "Failed to update user status." });
  }
});

router.patch("/users/:id/admin", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid user id." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    return res.json({
      success: true,
      message: `${user.username} is now ${user.isAdmin ? "an admin" : "a regular user"}.`,
      isAdmin: user.isAdmin
    });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id/admin error:", err);
    return res.status(500).json({ success: false, error: "Failed to update admin role." });
  }
});

router.patch("/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid user id." });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: "Temporary password is required." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.passwordHash = await bcrypt.hash(String(password), 10);
    user.mustChangePassword = true;
    await user.save();

    return res.json({
      success: true,
      message: `Password reset for ${user.username}.`
    });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id/reset-password error:", err);
    return res.status(500).json({ success: false, error: "Failed to reset password." });
  }
});

module.exports = router;