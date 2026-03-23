const mongoose = require("mongoose");

const PlayoffSeedSchema = new mongoose.Schema(
  {
    season: { type: Number, required: true, index: true },
    conference: {
      type: String,
      enum: ["EAST", "WEST"],
      required: true,
      uppercase: true,
      trim: true
    },
    seed: { type: Number, required: true, min: 1, max: 8 },
    teamAbbr: { type: String, required: true, uppercase: true, trim: true }
  },
  { timestamps: true }
);

PlayoffSeedSchema.index(
  { season: 1, conference: 1, seed: 1 },
  { unique: true }
);

module.exports = mongoose.model("PlayoffSeed", PlayoffSeedSchema);