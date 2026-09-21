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
 *
 * And one rule: stay out of the way. A worker with a fetch handler stands in
 * front of every request its pages make, and the browser shuts an idle worker
 * down after about thirty seconds — so, left alone, the next page load waits
 * for the worker to start again before its request can even leave. That is
 * exactly how people arrive: tapping a notification, a shared link, the home
 * screen icon. Two standard remedies, both below:
 *   - navigation preload: the browser sends the page request itself, in
 *     parallel with waking the worker, and the worker hands back that response
 *     instead of starting a second fetch after it wakes;
 *   - static routes: requests that are not page loads (scripts, images, data,
 *     map tiles) are declared network-only at install, so the browser does not
 *     wake the worker for them at all. Chrome 123+ understands these; other
 *     browsers ignore them and get the same result from the early return in
 *     the fetch handler, just after the worker is awake.
 */

const OFFLINE_CACHE = "pa-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(OFFLINE_CACHE)
        .then((cache) =>
          cache.add(new Request(OFFLINE_URL, { cache: "reload" })),
        ),
      skipWorkerForSubresources(event),
    ]).then(() => self.skipWaiting()),
  );
});

/**
 * Only navigations need this worker. Every other request mode goes straight
 * to the network without it. One rule per mode, rather than one `not`
 * condition, because `not` arrived in later Chrome versions than the API.
 */
function skipWorkerForSubresources(event) {
  if (typeof event.addRoutes !== "function") return Promise.resolve();
  return event
    .addRoutes(
      ["cors", "no-cors", "same-origin"].map((mode) => ({
        condition: { requestMode: mode },
        source: "network",
      })),
    )
    .catch(() => {
      // A browser that knows the API but refuses these rules loses nothing:
      // the fetch handler below lets the same requests through.
    });
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable().catch(() => {})
        : null,
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== OFFLINE_CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only navigations get the offline fallback; everything else is untouched.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        // Already on its way: the browser started it while this worker woke.
        // Undefined when preload is off (e.g. the very first load, before
        // activation), and then it is an ordinary fetch.
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
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
