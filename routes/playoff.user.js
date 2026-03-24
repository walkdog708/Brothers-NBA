const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");
const { requirePasswordChangeCleared } = require("../middleware/requirePasswordChangeCleared");

const { getAllowedConfidenceValues } = require("../utils/scoring");

const router = express.Router();
const PlayoffSeries = mongoose.model("PlayoffSeries");
const RoundPicks = mongoose.model("RoundPicks");

function getEffectiveSeriesStatus(series) {
  if (!series) return "OPEN";

  if (series.status === "FINAL") return "FINAL";

  const lockAt = series.lockAt ? new Date(series.lockAt) : null;
  if (lockAt && !Number.isNaN(lockAt.getTime()) && lockAt.getTime() <= Date.now()) {
    return "LOCKED";
  }

  return "OPEN";
}

function getRoundLockState(allSeries) {
  if (!Array.isArray(allSeries) || allSeries.length === 0) {
    return {
      locked: false,
      reason: ""
    };
  }

  const openSeries = allSeries.filter((s) => getEffectiveSeriesStatus(s) === "OPEN");

  if (openSeries.length === 0) {
    return {
      locked: true,
      reason: "This round is locked and can no longer be edited"
    };
  }

  return {
    locked: false,
    reason: ""
  };
}

// GET /api/playoff/series/open?season=2026&round=1
router.get("/series/open", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    const allSeriesDocs = await PlayoffSeries.find({
      season,
      round
    }).sort({
      conference: 1,
      seriesSlot: 1,
      higherSeed: 1
    });

    const allSeries = allSeriesDocs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      return {
        ...plain,
        computedStatus: getEffectiveSeriesStatus(plain)
      };
    });

    const lockState = getRoundLockState(allSeries);
    const openSeries = allSeries.filter((s) => s.computedStatus === "OPEN");

    return res.json({
      ok: true,
      series: openSeries,
      roundLocked: lockState.locked,
      lockReason: lockState.reason
    });
  } catch (err) {
    console.error("GET /api/playoff/series/open error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/playoff/mypicks?season=2026&round=4
router.get("/mypicks", requireAuth, requirePasswordChangeCleared, async (req, res) => {
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

    const [existing, allSeriesDocs] = await Promise.all([
      RoundPicks.findOne({ username, season, round }),
      PlayoffSeries.find({ season, round }).sort({
        conference: 1,
        seriesSlot: 1,
        higherSeed: 1
      })
    ]);

    const allSeries = allSeriesDocs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      return {
        ...plain,
        computedStatus: getEffectiveSeriesStatus(plain)
      };
    });

    const lockState = getRoundLockState(allSeries);

    return res.json({
      ok: true,
      picks: existing || null,
      roundLocked: lockState.locked,
      lockReason: lockState.reason,
      series: allSeries
    });
  } catch (err) {
    console.error("GET /api/playoff/mypicks error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/home-summary", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const username = req.session.user.username;
    const season = Number(req.query.season);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const rounds = [1, 2, 3, 4];

    const [allSeriesDocs, allPickDocs] = await Promise.all([
      PlayoffSeries.find({ season }).sort({
        round: 1,
        conference: 1,
        seriesSlot: 1,
        higherSeed: 1
      }),
      RoundPicks.find({ username, season })
    ]);

    const allSeries = allSeriesDocs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      return {
        ...plain,
        computedStatus: getEffectiveSeriesStatus(plain)
      };
    });

    const picksByRound = new Map(
      allPickDocs.map((doc) => [Number(doc.round), doc])
    );

    const roundSummaries = [];

    for (const round of rounds) {
      const roundSeries = allSeries.filter((s) => Number(s.round) === round);
      if (!roundSeries.length) continue;

      const openSeries = roundSeries.filter((s) => s.computedStatus === "OPEN");
      if (!openSeries.length) continue;

      const pickDoc = picksByRound.get(round);
      const pickMap = new Map(
        (pickDoc?.picks || []).map((p) => [String(p.seriesId), p])
      );

      const pickedOpenSeries = openSeries.filter((series) =>
        pickMap.has(String(series.seriesId))
      );

      const missingOpenSeries = openSeries.filter((series) =>
        !pickMap.has(String(series.seriesId))
      );

      const nextLockAt =
        missingOpenSeries
          .map((s) => (s.lockAt ? new Date(s.lockAt) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime())[0] || null;

      roundSummaries.push({
        round,
        openSeriesCount: openSeries.length,
        pickedOpenSeriesCount: pickedOpenSeries.length,
        missingOpenSeriesCount: missingOpenSeries.length,
        nextLockAt: nextLockAt ? nextLockAt.toISOString() : null
      });
    }

    const totalMissingOpenPicks = roundSummaries.reduce(
      (sum, r) => sum + Number(r.missingOpenSeriesCount || 0),
      0
    );

    const nextLockAtOverall =
      roundSummaries
        .map((r) => (r.nextLockAt ? new Date(r.nextLockAt) : null))
        .filter((d) => d && !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0] || null;

    return res.json({
      ok: true,
      season,
      summary: {
        totalMissingOpenPicks,
        openRounds: roundSummaries.length,
        isCaughtUp: totalMissingOpenPicks === 0,
        nextLockAt: nextLockAtOverall ? nextLockAtOverall.toISOString() : null
      },
      rounds: roundSummaries
    });
  } catch (err) {
    console.error("GET /api/playoff/home-summary error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/playoff/mypicks
router.post("/mypicks", requireAuth, requirePasswordChangeCleared, async (req, res) => {
  try {
    const username = req.session.user.username;

    const season = Number(req.body.season);
    const round = Number(req.body.round);
    const picks = Array.isArray(req.body.picks) ? req.body.picks : [];

    const rawTiebreakerPrediction = req.body.tiebreakerPrediction;
    const tiebreakerPrediction =
      rawTiebreakerPrediction === null ||
      rawTiebreakerPrediction === undefined ||
      rawTiebreakerPrediction === ""
        ? null
        : Number(rawTiebreakerPrediction);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    if (round === 4) {
      if (!Number.isFinite(tiebreakerPrediction)) {
        return res.status(400).json({
          error: "Tiebreaker prediction is required for the NBA Finals"
        });
      }

      if (tiebreakerPrediction < 50 || tiebreakerPrediction > 400) {
        return res.status(400).json({
          error: "Tiebreaker prediction must be between 50 and 400"
        });
      }
    }

    const allSeriesDocs = await PlayoffSeries.find({
      season,
      round
    }).sort({
      conference: 1,
      seriesSlot: 1,
      higherSeed: 1
    });

    if (!allSeriesDocs.length) {
      return res.status(400).json({ error: "No series found for this round" });
    }

    const allSeries = allSeriesDocs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      return {
        ...plain,
        computedStatus: getEffectiveSeriesStatus(plain)
      };
    });

    const lockState = getRoundLockState(allSeries);
    if (lockState.locked) {
      return res.status(400).json({
        error: lockState.reason || "This round is locked and can no longer be edited"
      });
    }

        const openSeries = allSeries.filter((s) => s.computedStatus === "OPEN");
        const lockedSeries = allSeries.filter((s) => s.computedStatus !== "OPEN");
        const allowedConfidenceValues = getAllowedConfidenceValues(round);

        const existingDoc = await RoundPicks.findOne({ username, season, round });

        const openSeriesIds = new Set(openSeries.map((s) => String(s.seriesId)));
        const allSeriesById = new Map(allSeries.map((s) => [String(s.seriesId), s]));
        const existingPickBySeriesId = new Map(
          (existingDoc?.picks || []).map((p) => [String(p.seriesId), p])
        );

        if (picks.length !== openSeries.length) {
          return res.status(400).json({
            error: `You must submit picks for all ${openSeries.length} unlocked series`
          });
        }

        const submittedSeriesIds = new Set();
        const submittedOpenPicks = [];

        for (const pick of picks) {
          const seriesId = String(pick.seriesId || "").trim();
          const pickTeam = String(pick.pickTeam || "").trim().toUpperCase();
          const confidence = Number(pick.confidence);
          const predictedGames = Number(pick.predictedGames);

          if (!openSeriesIds.has(seriesId)) {
            return res.status(400).json({ error: `Invalid or locked series: ${seriesId}` });
          }

          if (submittedSeriesIds.has(seriesId)) {
            return res.status(400).json({ error: `Duplicate series pick: ${seriesId}` });
          }
          submittedSeriesIds.add(seriesId);

          const matchingSeries = allSeriesById.get(seriesId);

          if (!matchingSeries) {
            return res.status(400).json({ error: `Series not found: ${seriesId}` });
          }

          const effectiveStatus =
            matchingSeries.computedStatus || getEffectiveSeriesStatus(matchingSeries);

          if (effectiveStatus !== "OPEN") {
            return res.status(400).json({
              error: `Series is locked and can no longer be edited: ${matchingSeries.matchupLabel}`
            });
          }

          const validTeams = [matchingSeries.higherSeedTeam, matchingSeries.lowerSeedTeam];

          if (!validTeams.includes(pickTeam)) {
            return res.status(400).json({ error: `Invalid team for series ${seriesId}` });
          }

          if (!Number.isFinite(confidence) || !allowedConfidenceValues.includes(confidence)) {
            return res.status(400).json({
              error: `Invalid confidence value for round ${round}`
            });
          }

          if (![4, 5, 6, 7].includes(predictedGames)) {
            return res.status(400).json({ error: "Predicted games must be 4, 5, 6, or 7" });
          }

          submittedOpenPicks.push({
            seriesId,
            pickTeam,
            confidence,
            predictedGames,
            winnerCorrect: null,
            bonusPoints: 0,
            pointsEarned: 0
          });
        }

        const mergedPickBySeriesId = new Map();

        for (const series of lockedSeries) {
          const seriesId = String(series.seriesId);
          const existingPick = existingPickBySeriesId.get(seriesId);

          if (!existingPick) {
            continue;
          }

          mergedPickBySeriesId.set(seriesId, {
            seriesId,
            pickTeam: String(existingPick.pickTeam || "").trim().toUpperCase(),
            confidence: Number(existingPick.confidence),
            predictedGames: Number(existingPick.predictedGames),
            winnerCorrect:
              existingPick.winnerCorrect === undefined ? null : existingPick.winnerCorrect,
            bonusPoints: Number(existingPick.bonusPoints || 0),
            pointsEarned: Number(existingPick.pointsEarned || 0)
          });
        }

        for (const pick of submittedOpenPicks) {
          mergedPickBySeriesId.set(String(pick.seriesId), pick);
        }

        const mergedPicks = allSeries
          .map((series) => mergedPickBySeriesId.get(String(series.seriesId)) || null)
          .filter(Boolean);

        const confidenceValues = mergedPicks.map((p) => Number(p.confidence));

        if (new Set(confidenceValues).size !== confidenceValues.length) {
          return res.status(400).json({
            error: "Confidence values must be unique within this round"
          });
        }

        for (const value of confidenceValues) {
          if (!allowedConfidenceValues.includes(value)) {
            return res.status(400).json({
              error: `Confidence values must come from: ${allowedConfidenceValues.join(", ")}`
            });
          }
        }


    const updatePayload = {
      username,
      season,
      round,
      picks: mergedPicks,
      submittedAt: new Date(),
      totalPoints: 0
    };

    if (round === 4) {
      updatePayload.tiebreakerPrediction = tiebreakerPrediction;
      updatePayload.tiebreakerSubmittedAt =
        existingDoc?.tiebreakerSubmittedAt || new Date();
    }

    const updated = await RoundPicks.findOneAndUpdate(
      { username, season, round },
      updatePayload,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.json({ ok: true, picks: updated });
  } catch (err) {
    console.error("POST /api/playoff/mypicks error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;