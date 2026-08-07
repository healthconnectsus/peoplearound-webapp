/**
 * Peoplearound service worker.
 *
 * Deliberately small. Two jobs:
 *   1. Serve an offline fallback page so a dead signal shows something human
 *      instead of the browser's dinosaur. We do NOT cache app HTML — this app
 *      is almost entirely personal, neighborhood-scoped, permission-checked
 *      data, and a stale cached page could show someone content they no
 *      longer have access to. Network-first, always.
 *   2. Receive push notifications and open the right page on click.
 *
 * Static build assets are already immutable-cached by the CDN; re-caching them
 * here would only add a second, staler copy.
 */

const OFFLINE_CACHE = "pa-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only navigations get the offline fallback; everything else is untouched.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_URL)) ?? Response.error();
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const body = payload.body || "Something happened around you.";
  event.waitUntil(
    self.registration.showNotification("Peoplearound", {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || undefined,
      data: { href: payload.href || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Reuse an already-open tab rather than piling up windows.
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(href);
            return client.focus();
          }
        }
        return self.clients.openWindow(href);
      }),
  );
});
