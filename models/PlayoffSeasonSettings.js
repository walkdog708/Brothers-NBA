const mongoose = require("mongoose");

const PlayoffSeasonSettingsSchema = new mongoose.Schema(
  {
    season: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    actualTiebreakerPoints: {
      type: Number,
      default: null,
      min: 50,
      max: 400
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayoffSeasonSettings", PlayoffSeasonSettingsSchema);