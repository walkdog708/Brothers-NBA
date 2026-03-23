const mongoose = require("mongoose");

const SeriesPickSchema = new mongoose.Schema(
  {
    seriesId: {
      type: String,
      required: true,
      trim: true
    },

    pickTeam: {
      type: String,
      required: true,
      trim: true
    },

    confidence: {
      type: Number,
      required: true,
      min: 1
    },

    predictedGames: {
      type: Number,
      required: true,
      enum: [4, 5, 6, 7]
    },

    winnerCorrect: {
      type: Boolean,
      default: null
    },

    bonusPoints: {
      type: Number,
      default: 0,
      min: 0
    },

    pointsEarned: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const RoundPicksSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true
    },

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

    picks: {
      type: [SeriesPickSchema],
      default: []
    },

    submittedAt: {
      type: Date,
      default: null
    },

    tiebreakerPrediction: {
      type: Number,
      default: null,
      min: 50,
      max: 400
    },

    tiebreakerSubmittedAt: {
      type: Date,
      default: null
    },

    totalPoints: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

RoundPicksSchema.index(
  { username: 1, season: 1, round: 1 },
  { unique: true }
);

module.exports = mongoose.model("RoundPicks", RoundPicksSchema);