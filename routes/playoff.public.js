const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");
const { requirePasswordChangeCleared } = require("../middleware/requirePasswordChangeCleared");

const router = express.Router();
const PlayoffSeries = mongoose.model("PlayoffSeries");
const RoundPicks = mongoose.model("RoundPicks");

const PlayoffSeasonSettings = require("../models/PlayoffSeasonSettings");

function isSeriesLocked(series, now = new Date()) {
  const status = String(series?.computedStatus || series?.status || "OPEN").toUpperCase();

  if (status === "LOCKED" || status === "FINAL") {
    return true;
  }

  if (series?.lockAt) {
    const lockAt = new Date(series.lockAt);
    if (!Number.isNaN(lockAt.getTime()) && lockAt <= now) {
      return true;
    }
  }

  return false;
}

function getRoundLocked(seriesList) {
  if (!Array.isArray(seriesList) || !seriesList.length) return false;

  const now = new Date();

  // Round is considered locked once picks are no longer editable.
  // If every series is locked/final (or past lockAt), the round is locked.
  return seriesList.every((series) => isSeriesLocked(series, now));
}

// GET /api/public/results?season=2026&round=1
router.get("/results", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);
    const username = req.session.user.username;

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    const [seriesList, picksDoc] = await Promise.all([
      PlayoffSeries.find({ season, round })
        .sort({ conference: 1, higherSeed: 1 })
        .lean(),
      RoundPicks.findOne({ username, season, round }).lean()
    ]);

    const roundLocked = getRoundLocked(seriesList);

    return res.json({
      ok: true,
      roundLocked,
      series: seriesList,
      picks: picksDoc || null
    });
  } catch (err) {
    console.error("GET /api/public/results error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/public/all-results?season=2026&round=1
router.get("/all-results", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    const seriesList = await PlayoffSeries.find({ season, round })
      .sort({ conference: 1, higherSeed: 1 })
      .lean();

    const roundLocked = getRoundLocked(seriesList);

    if (!roundLocked) {
      return res.status(403).json({
        error: "All Results will appear once this round locks.",
        roundLocked: false
      });
    }

    const docs = await RoundPicks.find({ season, round })
      .sort({ totalPoints: -1, username: 1 })
      .lean();

    const entries = docs.map((doc) => ({
      username: doc.username,
      totalPoints: Number(doc.totalPoints || 0),
      picks: Array.isArray(doc.picks) ? doc.picks : []
    }));

    return res.json({
      ok: true,
      roundLocked: true,
      series: seriesList,
      entries
    });
  } catch (err) {
    console.error("GET /api/public/all-results error:", err);
    return res.status(500).json({ error: "Server error loading all results" });
  }
});

function getExactBonusForRound(round) {
  const r = Number(round);

  if (r === 1) return 4;
  if (r === 2) return 8;
  if (r === 3) return 16;
  if (r === 4) return 40;

  return null;
}

router.get("/leaderboard/season", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const season = Number(req.query.season);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const docs = await RoundPicks.find({ season }).lean();

    const totalsMap = new Map();

    for (const doc of docs) {
      const username = String(doc.username || "").trim();
      if (!username) continue;

      const existing = totalsMap.get(username) || {
        username,
        totalPoints: 0,
        roundsPlayed: 0,
        tiebreakerPrediction: null,
        tiebreakerSubmittedAt: null
      };

      existing.totalPoints += Number(doc.totalPoints || 0);
      existing.roundsPlayed += 1;

      if (Number(doc.round) === 1) {
        if (Number.isFinite(Number(doc.tiebreakerPrediction))) {
          existing.tiebreakerPrediction = Number(doc.tiebreakerPrediction);
        }

        if (doc.tiebreakerSubmittedAt) {
          existing.tiebreakerSubmittedAt = doc.tiebreakerSubmittedAt;
        }
      }

      totalsMap.set(username, existing);
    }

    const leaderboard = Array.from(totalsMap.values());

    const seasonSettings = await PlayoffSeasonSettings.findOne({ season }).lean();
    const actualTiebreakerPoints = Number.isFinite(Number(seasonSettings?.actualTiebreakerPoints))
      ? Number(seasonSettings.actualTiebreakerPoints)
      : null;

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

      if (Number.isFinite(actualTiebreakerPoints)) {
        const diffA = Number.isFinite(a.tiebreakerPrediction)
          ? Math.abs(a.tiebreakerPrediction - actualTiebreakerPoints)
          : Number.POSITIVE_INFINITY;

        const diffB = Number.isFinite(b.tiebreakerPrediction)
          ? Math.abs(b.tiebreakerPrediction - actualTiebreakerPoints)
          : Number.POSITIVE_INFINITY;

        if (diffA !== diffB) return diffA - diffB;
      }

      const timeA = a.tiebreakerSubmittedAt
        ? new Date(a.tiebreakerSubmittedAt).getTime()
        : Number.POSITIVE_INFINITY;

      const timeB = b.tiebreakerSubmittedAt
        ? new Date(b.tiebreakerSubmittedAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (timeA !== timeB) return timeA - timeB;

      return a.username.localeCompare(b.username);
    });

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return res.json({
      ok: true,
      leaderboard: ranked
    });
  } catch (err) {
    console.error("GET /api/public/leaderboard/season error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/public/leaderboard?season=2026&round=1
router.get("/leaderboard", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    const docs = await RoundPicks.find({ season, round })
      .sort({
        totalPoints: -1,
        username: 1
      })
      .lean();

    const leaderboard = docs.map((doc) => {
      const picks = Array.isArray(doc.picks) ? doc.picks : [];
      const exactBonus = getExactBonusForRound(round);

      const correctWinners = picks.filter((p) => p.winnerCorrect === true).length;
      const bonusPoints = picks.reduce((sum, p) => sum + Number(p.bonusPoints || 0), 0);
      const exactHits = picks.filter((p) => Number(p.bonusPoints || 0) === exactBonus).length;

      return {
        username: doc.username,
        totalPoints: Number(doc.totalPoints || 0),
        correctWinners,
        bonusPoints,
        exactHits,
        submittedAt: doc.submittedAt
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctWinners !== a.correctWinners) return b.correctWinners - a.correctWinners;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
      return a.username.localeCompare(b.username);
    });

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return res.json({
      ok: true,
      leaderboard: ranked
    });
  } catch (err) {
    console.error("GET /api/public/leaderboard error:", err);
    return res.status(500).json({ error: "Server error" });
  }


});

module.exports = router;