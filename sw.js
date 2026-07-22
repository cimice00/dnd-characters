const CACHE_VERSION = "dnd-pwa-v1.7.10";
const APP_SHELL = [
  "./index.html",
  "./offline.html",
  "./styles.css",
  "./app.js",
  "./app-v13.js",
  "./spells-db.js",
  "./spells-db-it.js",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./pwa-icon.svg"
];

async function cleanRedirectedResponse(response) {
  if (!response || !response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function cacheAppShell(cache) {
  await Promise.all(
    APP_SHELL.map(async (asset) => {
      const request = new Request(asset, { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`Asset non disponibile: ${asset}`);
      await cache.put(asset, await cleanRedirectedResponse(response));
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cacheAppShell)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const clean = await cleanRedirectedResponse(response);
          if (clean.ok) {
            const copy = clean.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          }
          return clean;
        })
        .catch(() =>
          caches
            .match("./index.html")
            .then((cached) => cleanRedirectedResponse(cached))
            .then((cached) => cached || caches.match("./offline.html").then((fallback) => cleanRedirectedResponse(fallback)))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(async (cached) => {
      if (cached) return cleanRedirectedResponse(cached);
      return fetch(request)
        .then(async (response) => {
          const clean = await cleanRedirectedResponse(response);
          if (clean.ok) {
            const copy = clean.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return clean;
        })
        .catch(() => new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});
