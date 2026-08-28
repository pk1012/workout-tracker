const CACHE_NAME = "workout-tracker-v64";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css?v=1.7.64",
  "./css/components.css?v=1.7.64",
  "./css/responsive.css?v=1.7.64",
  "./js/data.js",
  "./js/workouts.js",
  "./js/exercises.js",
  "./js/progress.js",
  "./js/settings.js",
  "./js/app.js",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-512.png",
  "./assets/workout-hero.png",
];

const NETWORK_FIRST_TYPES = new Set([
  "document",
  "style",
  "script"
]);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith("workout-tracker-") &&
              key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Always prefer the newly deployed HTML/CSS/JS.
  // Use the cached copy only when offline.
  if (NETWORK_FIRST_TYPES.has(request.destination)) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached =>
              cached || caches.match("./index.html")
            )
        )
    );
    return;
  }

  // Static assets use cache-first for fast loading.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
  );
});
