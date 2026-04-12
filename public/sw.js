const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `catch-app-shell-${CACHE_VERSION}`;
const GOLD_DATA_CACHE = `catch-gold-data-${CACHE_VERSION}`;
const CACHE_PREFIXES = ["catch-app-shell-", "catch-gold-data-"];
const OFFLINE_MESSAGE = "You're offline — check back when connected.";

const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/assets/styles.css",
  "/main.ts",
  "/manifest.json",
  "/favicon.svg",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await Promise.all(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-cache" });
            if (response.ok) {
              await cache.put(url, response.clone());
            }
          } catch {
            // Ignore install-time fetch failures; runtime strategies still apply.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          const isManagedCache = CACHE_PREFIXES.some((prefix) =>
            cacheName.startsWith(prefix),
          );
          const isCurrent =
            cacheName === APP_SHELL_CACHE || cacheName === GOLD_DATA_CACHE;

          return isManagedCache && !isCurrent
            ? caches.delete(cacheName)
            : Promise.resolve(false);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.endsWith(".mp4")) {
    event.respondWith(fetch(request));
    return;
  }

  if (isGoldJsonRequest(url)) {
    event.respondWith(handleGoldJsonRequest(event, request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (shouldCacheAppShellAsset(request, url)) {
    event.respondWith(handleAppShellAsset(request));
  }
});

function isGoldJsonRequest(url) {
  return url.pathname.endsWith(".json") && url.pathname !== "/manifest.json";
}

function shouldCacheAppShellAsset(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (request.destination === "document") return true;

  return ["script", "style", "image", "font"].includes(request.destination);
}

async function handleAppShellAsset(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match("/offline.html");
    return fallback ?? createOfflineHtmlResponse();
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put("/index.html", response.clone());
    }
    return response;
  } catch {
    const cachedPage =
      (await caches.match(request)) ||
      (await caches.match("/index.html")) ||
      (await caches.match("/offline.html"));

    return cachedPage ?? createOfflineHtmlResponse();
  }
}

async function handleGoldJsonRequest(event, request) {
  const cache = await caches.open(GOLD_DATA_CACHE);
  const cached = await cache.match(request);
  const hasCached = Boolean(cached);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        if (hasCached) {
          event.waitUntil(notifyClients("gold-data-updated"));
        }
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return createOfflineJsonResponse();
}

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type }));
}

function createOfflineJsonResponse() {
  return new Response(JSON.stringify({ offline: true, message: OFFLINE_MESSAGE }), {
    status: 503,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createOfflineHtmlResponse() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title></head><body><main><h1>${OFFLINE_MESSAGE}</h1><p>Reconnect to refresh schedules and upcoming games.</p></main></body></html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}
