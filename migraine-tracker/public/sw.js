/*
 * A deliberately small service worker: it caches the app shell so the tracker
 * opens instantly and works with no connection, and it never caches weather
 * requests, which must always be live.
 */
const CACHE = "migraine-tracker-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Weather and geocoding always go to the network; a cached barometer reading
  // would be worse than no reading at all.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // Network first so a deployed update is picked up, with the cache as the
    // offline fallback.
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached ?? caches.match("/").then((shell) => shell ?? Response.error())),
      ),
  );
});
