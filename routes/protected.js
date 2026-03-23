const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/user-check", requireAuth, (req, res) => {
  res.json({
    ok: true,
    message: "You are logged in",
    user: req.session.user
  });
});

router.get("/admin-check", requireAdmin, (req, res) => {
  res.json({
    ok: true,
    message: "You are an admin",
    user: req.session.user
  });
});

module.exports = router;