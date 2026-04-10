const mongoose = require("mongoose");

const NotificationReminderLogSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    season: {
      type: Number,
      required: true
    },
    round: {
      type: Number,
      required: true
    },
    seriesId: {
      type: String,
      required: true,
      trim: true
    },
    reminderType: {
      type: String,
      required: true,
      enum: ["1h", "15m"]
    },
    lockAt: {
      type: Date,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

NotificationReminderLogSchema.index(
  { username: 1, season: 1, round: 1, seriesId: 1, reminderType: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "NotificationReminderLog",
  NotificationReminderLogSchema
);