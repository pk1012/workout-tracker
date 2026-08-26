const CACHE="workout-tracker-v27";
const ASSETS=[
 "./",
 "./index.html",
 "./manifest.webmanifest",
 "./css/styles.css?v=1.7.27",
 "./css/components.css?v=1.7.27",
 "./css/responsive.css?v=1.7.27",
 "./js/data.js",
 "./js/workouts.js",
 "./js/exercises.js",
 "./js/progress.js",
 "./js/settings.js",
 "./js/app.js",
 "./assets/icons/icon-180.png",
 "./assets/icons/icon-512.png",
];

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
  const copy=response.clone();
  caches.open(CACHE).then(cache=>cache.put(event.request,copy));
  return response;
 }).catch(()=>caches.match("./index.html"))));
});
