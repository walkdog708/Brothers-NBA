const mongoose = require("mongoose");

const PlayoffSeriesSchema = new mongoose.Schema(
  {
    season: {
      type: Number,
      required: true,
      index: true
    },

    round: {
      type: Number,
      required: true,
      index: true
    },

    conference: {
      type: String,
      enum: ["EAST", "WEST", "FINALS"],
      required: true,
      index: true
    },

    seriesSlot: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    seriesId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    matchupLabel: {
      type: String,
      required: true,
      trim: true
    },

    higherSeed: {
      type: Number,
      required: true
    },

    lowerSeed: {
      type: Number,
      required: true
    },

    higherSeedTeam: {
      type: String,
      required: true,
      trim: true
    },

    lowerSeedTeam: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["OPEN", "LOCKED", "FINAL"],
      default: "OPEN",
      index: true
    },

    lockAt: {
      type: Date,
      required: true
    },

    winnerTeam: {
      type: String,
      default: null,
      trim: true
    },

    gamesPlayed: {
      type: Number,
      default: null,
      min: 4,
      max: 7
    },

    higherSeedWins: {
      type: Number,
      default: 0,
      min: 0,
      max: 4
    },

    lowerSeedWins: {
      type: Number,
      default: 0,
      min: 0,
      max: 4
    }
  },
  { timestamps: true }
);

PlayoffSeriesSchema.index({ season: 1, round: 1, conference: 1 });
PlayoffSeriesSchema.index({ season: 1, round: 1, status: 1 });

// Prevent duplicate bracket slots for the same season/round/conference
PlayoffSeriesSchema.index(
  { season: 1, round: 1, conference: 1, seriesSlot: 1 },
  { unique: true }
);

module.exports = mongoose.model("PlayoffSeries", PlayoffSeriesSchema);