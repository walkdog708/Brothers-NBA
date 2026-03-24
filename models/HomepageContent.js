const mongoose = require("mongoose");

const WallOfFameEntrySchema = new mongoose.Schema(
  {
    season: { type: Number, required: true },
    championName: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const HomepageContentSchema = new mongoose.Schema(
  {
    season: { type: Number, required: true, unique: true, index: true },

    payouts: {
      first: { type: Number, default: 0, min: 0 },
      second: { type: Number, default: 0, min: 0 },
      third: { type: Number, default: 0, min: 0 },
      note: { type: String, default: "", trim: true }
    },

    wallOfFame: {
      type: [WallOfFameEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomepageContent", HomepageContentSchema);