const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ loggedIn: false });
    }

    return res.json({
      loggedIn: true,
      user: {
        username: req.session.user.username,
        firstName: req.session.user.firstName || "",
        lastName: req.session.user.lastName || "",
        email: req.session.user.email || "",
        isAdmin: !!req.session.user.isAdmin,
        mustChangePassword: !!req.session.user.mustChangePassword
      }
    });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.user = {
      id: String(user._id),
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      isAdmin: !!user.isAdmin,
      mustChangePassword: !!user.mustChangePassword
    };

    return res.json({
      ok: true,
      user: req.session.user
    });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("POST /api/auth/logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }

      res.clearCookie("connect.sid");
      return res.json({ ok: true });
    });
  } catch (err) {
    console.error("POST /api/auth/logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.session.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordOk) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false;
    await user.save();

    req.session.user.mustChangePassword = false;

    return res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/change-password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/auth/profile
router.put("/profile", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (firstName.length > 50) {
      return res.status(400).json({ error: "First name must be 50 characters or less" });
    }

    if (lastName.length > 50) {
      return res.status(400).json({ error: "Last name must be 50 characters or less" });
    }

    if (email.length > 120) {
      return res.status(400).json({ error: "Email must be 120 characters or less" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const user = await User.findById(req.session.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    await user.save();

    req.session.user.firstName = user.firstName || "";
    req.session.user.lastName = user.lastName || "";
    req.session.user.email = user.email || "";

    return res.json({
      ok: true,
      user: {
        username: user.username,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        isAdmin: !!user.isAdmin,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (err) {
    console.error("PUT /api/auth/profile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/auth/profile
router.put("/profile", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (firstName.length > 50) {
      return res.status(400).json({ error: "First name must be 50 characters or less" });
    }

    if (lastName.length > 50) {
      return res.status(400).json({ error: "Last name must be 50 characters or less" });
    }

    if (email.length > 120) {
      return res.status(400).json({ error: "Email must be 120 characters or less" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const user = await User.findById(req.session.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    await user.save();

    req.session.user.firstName = user.firstName || "";
    req.session.user.lastName = user.lastName || "";
    req.session.user.email = user.email || "";

    return res.json({
      ok: true,
      user: {
        username: user.username,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        isAdmin: !!user.isAdmin,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (err) {
    console.error("PUT /api/auth/profile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/auth/profile
router.put("/profile", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (firstName.length > 50) {
      return res.status(400).json({ error: "First name must be 50 characters or less" });
    }

    if (lastName.length > 50) {
      return res.status(400).json({ error: "Last name must be 50 characters or less" });
    }

    if (email.length > 120) {
      return res.status(400).json({ error: "Email must be 120 characters or less" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const user = await User.findById(req.session.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    await user.save();

    req.session.user.firstName = user.firstName || "";
    req.session.user.lastName = user.lastName || "";
    req.session.user.email = user.email || "";

    return res.json({
      ok: true,
      user: {
        username: user.username,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        isAdmin: !!user.isAdmin,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (err) {
    console.error("PUT /api/auth/profile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;