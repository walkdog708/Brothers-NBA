const mongoose = require("mongoose");
const { sendPushNotification } = require("../utils/push");

const User = mongoose.model("User");
const PlayoffSeries = mongoose.model("PlayoffSeries");
const RoundPicks = mongoose.model("RoundPicks");
const NotificationReminderLog = mongoose.model("NotificationReminderLog");

function getReminderType(minutesUntilLock) {
  if (minutesUntilLock <= 60 && minutesUntilLock > 55) {
    return "1h";
  }

  if (minutesUntilLock <= 15 && minutesUntilLock > 10) {
    return "15m";
  }

  return null;
}

function isSeriesOpen(series, now = new Date()) {
  const status = String(series?.computedStatus || series?.status || "OPEN").toUpperCase();

  if (status === "LOCKED" || status === "FINAL") {
    return false;
  }

  if (!series?.lockAt) {
    return false;
  }

  const lockAt = new Date(series.lockAt);
  if (Number.isNaN(lockAt.getTime())) {
    return false;
  }

  return lockAt > now;
}

async function runPushReminderCheck() {
  const now = new Date();

  try {
    const upcomingSeries = await PlayoffSeries.find({
      lockAt: {
        $gt: now,
        $lte: new Date(now.getTime() + 60 * 60 * 1000)
      }
    }).lean();

    if (!upcomingSeries.length) {
      return;
    }

    const users = await User.find({
      isActive: true,
      pushNotificationsEnabled: true,
      "pushSubscription.endpoint": { $ne: "" }
    }).lean();

    if (!users.length) {
      return;
    }

    for (const series of upcomingSeries) {
      if (!isSeriesOpen(series, now)) {
        continue;
      }

      const lockAt = new Date(series.lockAt);
      const minutesUntilLock = (lockAt.getTime() - now.getTime()) / (1000 * 60);
      const reminderType = getReminderType(minutesUntilLock);

      if (!reminderType) {
        continue;
      }

      for (const user of users) {
        const username = String(user.username || "").trim().toLowerCase();

        const existingPickDoc = await RoundPicks.findOne({
          username,
          season: series.season,
          round: series.round
        }).lean();

        const existingPick = existingPickDoc?.picks?.find(
          (pick) => String(pick.seriesId) === String(series.seriesId)
        );

        const hasCompletePick =
          !!existingPick &&
          !!existingPick.pickTeam &&
          [4, 5, 6, 7].includes(Number(existingPick.predictedGames)) &&
          Number.isFinite(Number(existingPick.confidence));

        if (hasCompletePick) {
          continue;
        }

        const alreadySent = await NotificationReminderLog.findOne({
          username,
          season: series.season,
          round: series.round,
          seriesId: series.seriesId,
          reminderType
        }).lean();

        if (alreadySent) {
          continue;
        }

        const payload = {
          title: "Brosero Hoops",
          body:
            reminderType === "15m"
              ? `${series.matchupLabel} locks in 15 minutes. You still have a pick to make.`
              : `${series.matchupLabel} locks in 1 hour. You still have a pick to make.`,
          url: `/mypicks.html`
        };

        try {
          await sendPushNotification(user.pushSubscription, payload);

          await NotificationReminderLog.create({
            username,
            season: series.season,
            round: series.round,
            seriesId: series.seriesId,
            reminderType,
            lockAt
          });

          console.log("Push reminder sent:", {
            username,
            reminderType,
            season: series.season,
            round: series.round,
            seriesId: series.seriesId,
            matchupLabel: series.matchupLabel
          });
        } catch (err) {
          console.error("Push reminder send failed:", {
            username,
            reminderType,
            season: series.season,
            round: series.round,
            seriesId: series.seriesId,
            statusCode: err?.statusCode,
            body: err?.body || err?.message
          });

          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await User.updateOne(
              { _id: user._id },
              {
                $set: {
                  pushNotificationsEnabled: false,
                  pushSubscription: {
                    endpoint: "",
                    expirationTime: null,
                    keys: {
                      p256dh: "",
                      auth: ""
                    },
                    userAgent: "",
                    subscribedAt: null
                  }
                }
              }
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("runPushReminderCheck error:", err);
  }
}

function startPushReminderJob() {
  console.log("Starting push reminder job...");

  runPushReminderCheck();

  setInterval(() => {
    runPushReminderCheck();
  }, 5 * 60 * 1000);
}

module.exports = {
  startPushReminderJob,
  runPushReminderCheck
};