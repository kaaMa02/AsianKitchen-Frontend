/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/** Payload example:
 * { "title":"New Order (Menu)", "body":"DELIVERY order ...", "url":"/admin/orders" }
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  const title = data.title || "Asian Kitchen";
  const body = data.body || "New activity";
  const url = data.url || "/admin";

  const options = {
    body,
    tag: "ak-admin",
    renotify: true,
    data: { url },
    // (optional) adjust paths to your icons or remove these two lines
    badge: "/icons/badge-72.png",
    icon: "/icons/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          c.postMessage({ type: "AK_PUSH_CLICK", url });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })()
  );
});
