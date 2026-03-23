const express = require("express");
const mongoose = require("mongoose");
const { requireAdmin } = require("../middleware/auth");
const { scoreSeriesPick } = require("../utils/scoring");

const router = express.Router();
const PlayoffSeries = mongoose.model("PlayoffSeries");
const RoundPicks = mongoose.model("RoundPicks");
const PlayoffSeed = require("../models/PlayoffSeed");

const PlayoffSeasonSettings = require("../models/PlayoffSeasonSettings");

function getAllowedSlotsByRound(round) {
  return {
    1: ["1v8", "2v7", "3v6", "4v5"],
    2: ["s1", "s2"],
    3: ["conf"],
    4: ["finals"]
  }[round] || [];
}

function getPreviousRoundSlots(round, seriesSlot) {
  const r = Number(round);
  const slot = String(seriesSlot || "").trim();

  if (r === 2) {
    if (slot === "s1") return ["1v8", "4v5"];
    if (slot === "s2") return ["2v7", "3v6"];
  }

  if (r === 3) {
    if (slot === "conf") return ["s1", "s2"];
  }

  return null;
}

function getWinnerInfo(series) {
  if (!series || series.status !== "FINAL" || !series.winnerTeam) return null;

  const higherSeed = Number(series.higherSeed);
  const lowerSeed = Number(series.lowerSeed);

  if (series.winnerTeam === series.higherSeedTeam) {
    return {
      seed: higherSeed,
      teamAbbr: series.higherSeedTeam
    };
  }

  if (series.winnerTeam === series.lowerSeedTeam) {
    return {
      seed: lowerSeed,
      teamAbbr: series.lowerSeedTeam
    };
  }

  return null;
}

async function getSeedBoardMatchup({ season, conference, seriesSlot }) {
  const slotMap = {
    "1v8": [1, 8],
    "2v7": [2, 7],
    "3v6": [3, 6],
    "4v5": [4, 5]
  };

  const seeds = slotMap[String(seriesSlot || "").trim()];
  if (!seeds) return null;

  const [higherSeed, lowerSeed] = seeds;

  const rows = await PlayoffSeed.find({
    season,
    conference,
    seed: { $in: [higherSeed, lowerSeed] }
  }).lean();

  const seedMap = new Map(rows.map((row) => [Number(row.seed), row.teamAbbr]));

  const higherSeedTeam = seedMap.get(higherSeed) || "";
  const lowerSeedTeam = seedMap.get(lowerSeed) || "";

  if (!higherSeedTeam || !lowerSeedTeam) {
    return null;
  }

  return {
    higherSeed,
    lowerSeed,
    higherSeedTeam,
    lowerSeedTeam,
    matchupLabel: `${higherSeed} ${higherSeedTeam} vs ${lowerSeed} ${lowerSeedTeam}`
  };
}

async function getPreviousRoundMatchup({ season, round, conference, seriesSlot }) {
  const priorSlots = getPreviousRoundSlots(round, seriesSlot);
  if (!priorSlots) return null;

  const prevRound = Number(round) - 1;

  const priorSeries = await PlayoffSeries.find({
    season,
    round: prevRound,
    conference,
    seriesSlot: { $in: priorSlots }
  }).lean();

  const bySlot = new Map(priorSeries.map((s) => [s.seriesSlot, s]));
  const first = bySlot.get(priorSlots[0]);
  const second = bySlot.get(priorSlots[1]);

  const firstWinner = getWinnerInfo(first);
  const secondWinner = getWinnerInfo(second);

  if (!firstWinner || !secondWinner) {
    return null;
  }

  const ordered = [firstWinner, secondWinner].sort((a, b) => a.seed - b.seed);

  return {
    higherSeed: ordered[0].seed,
    lowerSeed: ordered[1].seed,
    higherSeedTeam: ordered[0].teamAbbr,
    lowerSeedTeam: ordered[1].teamAbbr,
    matchupLabel: `${ordered[0].seed} ${ordered[0].teamAbbr} vs ${ordered[1].seed} ${ordered[1].teamAbbr}`
  };
}

async function getFinalsMatchup({ season }) {
  const confWinners = await PlayoffSeries.find({
    season,
    round: 3,
    seriesSlot: "conf",
    conference: { $in: ["EAST", "WEST"] }
  }).lean();

  const eastSeries = confWinners.find((s) => s.conference === "EAST");
  const westSeries = confWinners.find((s) => s.conference === "WEST");

  const eastWinner = getWinnerInfo(eastSeries);
  const westWinner = getWinnerInfo(westSeries);

  if (!eastWinner || !westWinner) {
    return null;
  }

  const ordered = [eastWinner, westWinner].sort((a, b) => a.seed - b.seed);

  return {
    higherSeed: ordered[0].seed,
    lowerSeed: ordered[1].seed,
    higherSeedTeam: ordered[0].teamAbbr,
    lowerSeedTeam: ordered[1].teamAbbr,
    matchupLabel: `${ordered[0].seed} ${ordered[0].teamAbbr} vs ${ordered[1].seed} ${ordered[1].teamAbbr}`
  };
}

function getEffectiveSeriesStatus(series) {
  if (!series) return "OPEN";

  if (series.status === "FINAL") return "FINAL";

  const lockAt = series.lockAt ? new Date(series.lockAt) : null;
  if (lockAt && !Number.isNaN(lockAt.getTime()) && lockAt.getTime() <= Date.now()) {
    return "LOCKED";
  }

  return "OPEN";
}

// GET /api/admin/playoff/season-settings?season=2026
router.get("/season-settings", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.query.season);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const settings = await PlayoffSeasonSettings.findOne({ season }).lean();

    return res.json({
      ok: true,
      season,
      actualTiebreakerPoints: Number.isFinite(Number(settings?.actualTiebreakerPoints))
        ? Number(settings.actualTiebreakerPoints)
        : null
    });
  } catch (err) {
    console.error("GET /api/admin/playoff/season-settings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/playoff/season-settings/tiebreaker
router.post("/season-settings/tiebreaker", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.body.season);
    const actualTiebreakerPoints = Number(req.body.actualTiebreakerPoints);

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (!Number.isFinite(actualTiebreakerPoints) || actualTiebreakerPoints < 50 || actualTiebreakerPoints > 400) {
      return res.status(400).json({ error: "Actual tiebreaker points must be between 50 and 400" });
    }

    const settings = await PlayoffSeasonSettings.findOneAndUpdate(
      { season },
      {
        season,
        actualTiebreakerPoints
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.json({
      ok: true,
      season: settings.season,
      actualTiebreakerPoints: settings.actualTiebreakerPoints
    });
  } catch (err) {
    console.error("POST /api/admin/playoff/season-settings/tiebreaker error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/series?season=2026&round=1
router.get("/series", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);

    const filter = {};

    if (Number.isFinite(season)) filter.season = season;
    if (Number.isFinite(round)) filter.round = round;

    const docs = await PlayoffSeries.find(filter).sort({
      season: 1,
      round: 1,
      conference: 1,
      seriesSlot: 1,
      createdAt: 1
    });

    const series = docs.map((doc) => {
      const plain = doc.toObject ? doc.toObject() : doc;
      return {
        ...plain,
        computedStatus: getEffectiveSeriesStatus(plain)
      };
    });

    return res.json({ ok: true, series });
  } catch (err) {
    console.error("GET /api/admin/series error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/series/autofill?season=2026&round=2&conference=EAST&seriesSlot=s1
router.get("/series/autofill", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.query.season);
    const round = Number(req.query.round);
    const conference = String(req.query.conference || "").trim().toUpperCase();
    const seriesSlot = String(req.query.seriesSlot || "").trim();

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    if (!seriesSlot) {
      return res.status(400).json({ error: "seriesSlot is required" });
    }

    const allowedSlots = getAllowedSlotsByRound(round);
    if (!allowedSlots.includes(seriesSlot)) {
      return res.status(400).json({ error: "Invalid seriesSlot for selected round" });
    }

    let matchup = null;

    if (round === 1) {
      if (!["EAST", "WEST"].includes(conference)) {
        return res.status(400).json({ error: "Round 1 conference must be EAST or WEST" });
      }

      matchup = await getSeedBoardMatchup({
        season,
        conference,
        seriesSlot
      });
    } else if (round === 4) {
      matchup = await getFinalsMatchup({ season });
    } else {
      if (!["EAST", "WEST"].includes(conference)) {
        return res.status(400).json({ error: "Conference must be EAST or WEST" });
      }

      matchup = await getPreviousRoundMatchup({
        season,
        round,
        conference,
        seriesSlot
      });
    }

    if (!matchup) {
      return res.status(404).json({
        error: "Unable to autofill this matchup yet. Make sure prior round winners or seed assignments are saved."
      });
    }

    return res.json({
      ok: true,
      matchup
    });
  } catch (err) {
    console.error("GET /api/admin/series/autofill error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/series
router.post("/series", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.body.season);
    const round = Number(req.body.round);
    const conference = String(req.body.conference || "").trim().toUpperCase();
    const seriesSlot = String(req.body.seriesSlot || "").trim();

    const higherSeed = Number(req.body.higherSeed);
    const lowerSeed = Number(req.body.lowerSeed);

    const higherSeedTeam = String(req.body.higherSeedTeam || "").trim().toUpperCase();
    const lowerSeedTeam = String(req.body.lowerSeedTeam || "").trim().toUpperCase();

    const matchupLabel = String(req.body.matchupLabel || "").trim();
    const lockAtRaw = String(req.body.lockAt || "").trim();

    if (!Number.isFinite(season) || season < 2000) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: "Round must be 1, 2, 3, or 4" });
    }

    if (!["EAST", "WEST", "FINALS"].includes(conference)) {
      return res.status(400).json({ error: "Conference must be EAST, WEST, or FINALS" });
    }

    if (round === 4 && conference !== "FINALS") {
      return res.status(400).json({ error: "Round 4 must use FINALS conference" });
    }

    if (round !== 4 && conference === "FINALS") {
      return res.status(400).json({ error: "FINALS conference is only valid for Round 4" });
    }

    if (!seriesSlot) {
      return res.status(400).json({ error: "seriesSlot is required" });
    }

    const allowedSlots = getAllowedSlotsByRound(round);
    if (!allowedSlots.includes(seriesSlot)) {
      return res.status(400).json({ error: "Invalid seriesSlot for selected round" });
    }

    if (!Number.isFinite(higherSeed) || !Number.isFinite(lowerSeed)) {
      return res.status(400).json({ error: "Valid seed numbers are required" });
    }

    if (!higherSeedTeam || !lowerSeedTeam) {
      return res.status(400).json({ error: "Both team names are required" });
    }

    if (higherSeedTeam === lowerSeedTeam) {
      return res.status(400).json({ error: "Teams must be different" });
    }

    if (!matchupLabel) {
      return res.status(400).json({ error: "Matchup label is required" });
    }

    if (!lockAtRaw) {
      return res.status(400).json({ error: "Lock date/time is required" });
    }

    const lockAt = new Date(lockAtRaw);

    if (Number.isNaN(lockAt.getTime())) {
      return res.status(400).json({ error: "Invalid lock date/time" });
    }

    const existing = await PlayoffSeries.findOne({
      season,
      round,
      conference,
      seriesSlot
    });

    if (existing) {
      return res.status(400).json({
        error: `Series already exists for ${season} Round ${round} ${conference} ${seriesSlot}`
      });
    }

    const seriesId = `${season}-R${round}-${conference}-${seriesSlot}`;

    const created = await PlayoffSeries.create({
      season,
      round,
      conference,
      seriesSlot,
      seriesId,
      matchupLabel,
      higherSeed,
      lowerSeed,
      higherSeedTeam,
      lowerSeedTeam,
      status: "OPEN",
      lockAt
    });

    return res.json({ ok: true, series: created });
  } catch (err) {
    console.error("POST /api/admin/series error:", err);

    if (err && err.code === 11000) {
      return res.status(400).json({
        error: "That series slot already exists for this season, round, and conference."
      });
    }

    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/playoff-seeds", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.query.season);
    if (!Number.isFinite(season)) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    const seeds = await PlayoffSeed.find({ season })
      .sort({ conference: 1, seed: 1 })
      .lean();

    return res.json({ success: true, seeds });
  } catch (err) {
    console.error("GET /api/admin/playoff-seeds error:", err);
    return res.status(500).json({ error: "Server error loading playoff seeds" });
  }
});

router.post("/playoff-seeds", requireAdmin, async (req, res) => {
  try {
    const season = Number(req.body.season);
    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];

    if (!Number.isFinite(season)) {
      return res.status(400).json({ error: "Valid season is required" });
    }

    if (!assignments.length) {
      return res.status(400).json({ error: "Assignments are required" });
    }

    const normalized = assignments.map((a) => ({
      season,
      conference: String(a.conference || "").trim().toUpperCase(),
      seed: Number(a.seed),
      teamAbbr: String(a.teamAbbr || "").trim().toUpperCase()
    }));

    for (const row of normalized) {
      if (!["EAST", "WEST"].includes(row.conference)) {
        return res.status(400).json({ error: `Invalid conference for seed ${row.seed}` });
      }
      if (!Number.isFinite(row.seed) || row.seed < 1 || row.seed > 8) {
        return res.status(400).json({ error: `Invalid seed value: ${row.seed}` });
      }
      if (!row.teamAbbr) {
        return res.status(400).json({ error: `Missing team for ${row.conference} seed ${row.seed}` });
      }
    }

    const seenSlots = new Set();
    const seenTeams = new Set();

    for (const row of normalized) {
      const slotKey = `${row.conference}-${row.seed}`;
      if (seenSlots.has(slotKey)) {
        return res.status(400).json({ error: `Duplicate assignment for ${slotKey}` });
      }
      seenSlots.add(slotKey);

      const teamKey = `${row.conference}-${row.teamAbbr}`;
      if (seenTeams.has(teamKey)) {
        return res.status(400).json({ error: `Duplicate team in ${row.conference}: ${row.teamAbbr}` });
      }
      seenTeams.add(teamKey);
    }

    await PlayoffSeed.deleteMany({ season });

    await PlayoffSeed.insertMany(normalized);

    return res.json({
      success: true,
      message: "Playoff seeds saved successfully."
    });
  } catch (err) {
    console.error("POST /api/admin/playoff-seeds error:", err);
    return res.status(500).json({ error: "Server error saving playoff seeds" });
  }
});

// POST /api/admin/series/update
router.post("/series/update", requireAdmin, async (req, res) => {
  try {
    const seriesId = String(req.body.seriesId || "").trim();
    const matchupLabel = String(req.body.matchupLabel || "").trim();
    const lockAtRaw = String(req.body.lockAt || "").trim();
    const higherSeedTeam = String(req.body.higherSeedTeam || "").trim().toUpperCase();
    const lowerSeedTeam = String(req.body.lowerSeedTeam || "").trim().toUpperCase();

    if (!seriesId) {
      return res.status(400).json({ error: "seriesId is required" });
    }

    if (!matchupLabel) {
      return res.status(400).json({ error: "matchupLabel is required" });
    }

    if (!lockAtRaw) {
      return res.status(400).json({ error: "lockAt is required" });
    }

    if (!higherSeedTeam || !lowerSeedTeam) {
      return res.status(400).json({ error: "Both team names are required" });
    }

    if (higherSeedTeam === lowerSeedTeam) {
      return res.status(400).json({ error: "Teams must be different" });
    }

    const lockAt = new Date(lockAtRaw);
    if (Number.isNaN(lockAt.getTime())) {
      return res.status(400).json({ error: "Invalid lock date/time" });
    }

    const series = await PlayoffSeries.findOne({ seriesId });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    const effectiveStatus = getEffectiveSeriesStatus(series);

    if (effectiveStatus === "FINAL") {
      return res.status(400).json({ error: "Final series cannot be edited" });
    }

    if (effectiveStatus === "LOCKED") {
      return res.status(400).json({ error: "Locked series cannot be edited" });
    }

    series.matchupLabel = matchupLabel;
    series.lockAt = lockAt;
    series.higherSeedTeam = higherSeedTeam;
    series.lowerSeedTeam = lowerSeedTeam;

    if (series.winnerTeam && ![higherSeedTeam, lowerSeedTeam].includes(series.winnerTeam)) {
      series.winnerTeam = null;
      series.gamesPlayed = null;
      series.higherSeedWins = 0;
      series.lowerSeedWins = 0;
      series.status = "OPEN";
    }

    await series.save();

    return res.json({
      ok: true,
      message: "Series updated successfully.",
      series
    });
  } catch (err) {
    console.error("POST /api/admin/series/update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/series/finalize
router.post("/series/finalize", requireAdmin, async (req, res) => {
  try {
    const seriesId = String(req.body.seriesId || "").trim();
    const winnerTeam = String(req.body.winnerTeam || "").trim().toUpperCase();
    const gamesPlayed = Number(req.body.gamesPlayed);

    if (!seriesId) {
      return res.status(400).json({ error: "seriesId is required" });
    }

    if (![4, 5, 6, 7].includes(gamesPlayed)) {
      return res.status(400).json({ error: "gamesPlayed must be 4, 5, 6, or 7" });
    }

    const series = await PlayoffSeries.findOne({ seriesId });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    const validTeams = [series.higherSeedTeam, series.lowerSeedTeam];
    if (!validTeams.includes(winnerTeam)) {
      return res.status(400).json({ error: "winnerTeam must match one of the series teams" });
    }

    series.winnerTeam = winnerTeam;
    series.gamesPlayed = gamesPlayed;
    series.status = "FINAL";

    if (winnerTeam === series.higherSeedTeam) {
      series.higherSeedWins = 4;
      series.lowerSeedWins = gamesPlayed - 4;
    } else {
      series.lowerSeedWins = 4;
      series.higherSeedWins = gamesPlayed - 4;
    }

    await series.save();

    const roundPicksDocs = await RoundPicks.find({
      season: series.season,
      round: series.round
    });

    let updatedDocs = 0;

    for (const doc of roundPicksDocs) {
      let changed = false;

      doc.picks = doc.picks.map((pick) => {
        const plainPick = pick.toObject ? pick.toObject() : pick;

        if (plainPick.seriesId !== series.seriesId) {
          return plainPick;
        }

        changed = true;

        return {
          ...plainPick,
          ...scoreSeriesPick(series.round, plainPick, series.winnerTeam, series.gamesPlayed)
        };
      });

      if (changed) {
        doc.totalPoints = doc.picks.reduce((sum, pick) => {
          return sum + Number(pick.pointsEarned || 0);
        }, 0);

        await doc.save();
        updatedDocs += 1;
      }
    }

    return res.json({
      ok: true,
      message: `Series finalized and ${updatedDocs} pick document(s) scored.`,
      series
    });
  } catch (err) {
    console.error("POST /api/admin/series/finalize error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;