self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};

  try {
    data = event.data.json();
  } catch (err) {
    console.error("Push payload parse error:", err);
    return;
  }

  const title = data.title || "Brosero Hoops";
  const options = {
    body: data.body || "You have an update.",
    icon: "/images/icon-192.png",
    badge: "/images/badge-72.png",
    data: {
      url: data.url || "/mypicks.html"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/mypicks.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});