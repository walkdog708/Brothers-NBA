const webpush = require("web-push");

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  console.warn("Web push is not fully configured. Missing VAPID env vars.");
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

async function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = {
  webpush,
  sendPushNotification,
  vapidPublicKey,
};