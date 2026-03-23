const mongoose = require("mongoose");

const SeriesSchema = new mongoose.Schema(
  {
    seriesId: { type: String, required: true, unique: true, index: true },
    season: { type: Number, required: true, index: true },
    round: { type: Number, required: true, index: true },
    conference: { type: String, required: true, trim: true, index: true },
    seriesSlot: { type: String, required: true, trim: true, index: true },

    matchupLabel: { type: String, required: true, trim: true },

    higherSeed: { type: Number, required: true },
    lowerSeed: { type: Number, required: true },

    higherSeedTeam: { type: String, required: true, trim: true },
    lowerSeedTeam: { type: String, required: true, trim: true },

    lockAt: { type: Date, required: true },

    status: { type: String, default: "OPEN" },
    winnerTeam: { type: String, default: null },
    gamesPlayed: { type: Number, default: null }
  },
  { timestamps: true }
);

// put the compound index here
SeriesSchema.index(
  { season: 1, round: 1, conference: 1, seriesSlot: 1 },
  { unique: true }
);

module.exports = mongoose.models.Series || mongoose.model("Series", SeriesSchema);