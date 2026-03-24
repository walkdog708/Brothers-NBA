const express = require("express");
const mongoose = require("mongoose");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const HomepageContent = mongoose.model("HomepageContent");

function normalizeSeason(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 2000 ? n : null;
}

// PUBLIC: homepage content
router.get("/public/homepage-content", async (req, res) => {
  try {
    const season = normalizeSeason(req.query.season);
    if (!season) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const doc = await HomepageContent.findOne({ season }).lean();

    return res.json({
      season,
      payouts: doc?.payouts || {
        first: 0,
        second: 0,
        third: 0,
        note: ""
      },
      wallOfFame: Array.isArray(doc?.wallOfFame) ? doc.wallOfFame : []
    });
  } catch (err) {
    console.error("GET /api/public/homepage-content error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ADMIN: read current season content
router.get("/admin/homepage-content", requireAdmin, async (req, res) => {
  try {
    const season = normalizeSeason(req.query.season);
    if (!season) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    let doc = await HomepageContent.findOne({ season }).lean();

    if (!doc) {
      doc = {
        season,
        payouts: { first: 0, second: 0, third: 0, note: "" },
        wallOfFame: []
      };
    }

    return res.json({ success: true, content: doc });
  } catch (err) {
    console.error("GET /api/admin/homepage-content error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ADMIN: save current season content
router.post("/admin/homepage-content", requireAdmin, async (req, res) => {
  try {
    const season = normalizeSeason(req.body.season);
    if (!season) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const payouts = req.body?.payouts || {};
    const rawWall = Array.isArray(req.body?.wallOfFame) ? req.body.wallOfFame : [];

    const wallOfFame = rawWall
      .map((entry) => ({
        season: Number(entry?.season),
        championName: String(entry?.championName || "").trim(),
        notes: String(entry?.notes || "").trim()
      }))
      .filter((entry) => Number.isFinite(entry.season) && entry.season >= 2000 && entry.championName);

    const update = {
      season,
      payouts: {
        first: Math.max(0, Number(payouts.first || 0)),
        second: Math.max(0, Number(payouts.second || 0)),
        third: Math.max(0, Number(payouts.third || 0)),
        note: String(payouts.note || "").trim()
      },
      wallOfFame
    };

    const doc = await HomepageContent.findOneAndUpdate(
      { season },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, content: doc });
  } catch (err) {
    console.error("POST /api/admin/homepage-content error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;