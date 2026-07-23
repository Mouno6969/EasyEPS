/* EasyEPS service worker — app shell plus learner-selected offline lessons. */
const SHELL_CACHE = "easyeps-shell-v2";
const LESSON_CACHE = "easyeps-lessons-v1";
const ALL_CACHES = [SHELL_CACHE, LESSON_CACHE];
const PRECACHE = ["/", "/manifest.webmanifest", "/basics/hub-hero.jpg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => !ALL_CACHES.includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isCurriculumQuery(url) {
  return url.origin === self.location.origin
    && url.pathname.startsWith("/api/trpc")
    && (url.pathname.includes("curriculum.get") || url.pathname.includes("curriculum.list"));
}

async function networkWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline-and-not-cached");
  }
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isCurriculumQuery(url)) {
    event.respondWith(networkWithCacheFallback(request, LESSON_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            void caches.open(SHELL_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/");
          throw new Error("offline-and-not-cached");
        });
      return cached || network;
    }),
  );
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "CACHE_LESSON_ROUTES" && Array.isArray(data.routes)) {
    event.waitUntil(
      caches.open(SHELL_CACHE).then(cache =>
        Promise.all(
          data.routes
            .filter(route => typeof route === "string" && route.startsWith("/lesson/"))
            .map(route => cache.add(route).catch(() => undefined)),
        ),
      ),
    );
  }
  if (data.type === "CLEAR_OFFLINE_LESSONS") {
    event.waitUntil(caches.delete(LESSON_CACHE));
  }
});
