const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const User = mongoose.model("User");
const { vapidPublicKey, sendPushNotification } = require("../utils/push");

router.get("/public-key", requireAuth, (req, res) => {
  if (!vapidPublicKey) {
    return res.status(500).json({ error: "Push notifications are not configured." });
  }

  res.json({ publicKey: vapidPublicKey });
});

router.get("/status", requireAuth, async (req, res) => {
  try {
    const username = String(req.session.user.username || "").trim().toLowerCase();

    const user = await User.findOne({ username }).select(
      "pushNotificationsEnabled pushSubscription.endpoint"
    );

    return res.json({
      enabled: Boolean(user?.pushNotificationsEnabled),
      subscribed: Boolean(user?.pushSubscription?.endpoint)
    });
  } catch (err) {
    console.error("notifications status error:", err);
    return res.status(500).json({ error: "Failed to load notification status." });
  }
});

router.post("/subscribe", requireAuth, async (req, res) => {
  try {
    const username = String(req.session.user.username || "").trim().toLowerCase();
    const subscription = req.body?.subscription;

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({ error: "Valid push subscription is required." });
    }

    const result = await User.updateOne(
      { username },
      {
        $set: {
          pushNotificationsEnabled: true,
          pushSubscription: {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime
              ? new Date(subscription.expirationTime)
              : null,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            },
            userAgent: req.get("user-agent") || "",
            subscribedAt: new Date()
          }
        }
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("subscribe error:", err);
    return res.status(500).json({ error: "Failed to save push subscription." });
  }
});

router.post("/unsubscribe", requireAuth, async (req, res) => {
  try {
    const username = String(req.session.user.username || "").trim().toLowerCase();

    const result = await User.updateOne(
      { username },
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

    if (!result.matchedCount) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("unsubscribe error:", err);
    return res.status(500).json({ error: "Failed to remove push subscription." });
  }
});

router.post("/test", requireAuth, async (req, res) => {
  try {
    const username = String(req.session.user.username || "").trim().toLowerCase();

    const user = await User.findOne({ username }).select(
      "username pushNotificationsEnabled pushSubscription"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.pushNotificationsEnabled) {
      return res.status(400).json({ error: "Push notifications are not enabled for this user." });
    }

    const subscription = user.pushSubscription;

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({ error: "No valid push subscription found for this user." });
    }

    const payload = {
      title: "Brosero Hoops Test",
      body: "This is a test notification from your NBA picks app.",
      url: "/mypicks.html"
    };

    await sendPushNotification(subscription, payload);

    return res.json({ success: true, message: "Test notification sent." });
  } catch (err) {
    console.error("test notification error:", err);

    if (err.statusCode === 404 || err.statusCode === 410) {
      return res.status(410).json({
        error: "Push subscription is no longer valid. Please re-enable reminders in the browser."
      });
    }

    return res.status(500).json({ error: "Failed to send test notification." });
  }
});

module.exports = router;