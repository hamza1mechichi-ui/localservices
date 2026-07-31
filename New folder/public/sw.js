const STATIC_CACHE = "localservices-static-v2";
const TILE_CACHE = "localservices-tiles-v1";
const STATIC_ASSETS = [
  "/",
  "/prestataires",
  "/connexion",
  "/inscription",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== TILE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Tuiles de carte OpenStreetMap : cache-first, cache dédié.
  // Elles changent rarement et sont volumineuses/répétitives (même quartier revisité
  // souvent) — un cache-first réduit fortement la consommation data en 3G/4G.
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Tout le reste du cross-origin (Nominatim, etc.) : réseau direct, jamais mis en cache.
  if (url.origin !== self.location.origin) return;

  // App shell explicite : cache-first.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Assets Next.js / uploads : stale-while-revalidate.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/uploads/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        fetch(request)
          .then((res) => {
            cache.put(request, res.clone());
            return res;
          })
          .catch(() => caches.match(request))
      )
    );
    return;
  }

  // Navigation HTML : réseau d'abord, repli sur le cache puis sur la page offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(request)) || caches.match("/offline.html")
      )
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
