const CACHE_NAME = "workout-tracker-v294";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./css/styles.css?v=1.7.293",
  "./css/components.css?v=1.7.293",
  "./css/responsive.css?v=1.7.293",
  "./css/home.css?v=1.7.293",
  "./css/workouts.css?v=1.7.293",
  "./css/progress.css?v=1.7.293",
  "./css/exercises.css?v=1.7.293",
  "./css/settings.css?v=1.7.293",
  "./css/recycle.css?v=1.7.293",
  "./js/data-rules.js?v=1.7.293",
  "./js/xlsx-export.js?v=1.7.293",
  "./js/data.js?v=1.7.293",
  "./js/workouts.js?v=1.7.293",
  "./js/home.js?v=1.7.293",
  "./js/exercises.js?v=1.7.293",
  "./js/progress.js?v=1.7.293",
  "./js/settings.js?v=1.7.293",
  "./js/recycle.js?v=1.7.293",
  "./js/drive-config.js?v=1.7.293",
  "./js/drive-policy.js?v=1.7.293",
  "./js/drive.js?v=1.7.293",
  "./js/app.js?v=1.7.293",
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

self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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

  const path = url.pathname;
  const isAppFile =
    request.mode === "navigate" ||
    NETWORK_FIRST_TYPES.has(request.destination) ||
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".html") ||
    path.endsWith(".webmanifest") ||
    path.endsWith("/");

  // iOS home-screen requests often have an empty destination, so they
  // used to hit cache-first and keep the old unversioned data.js.
  if (isAppFile) {
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
