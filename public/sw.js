/**
 * Service Worker — Placeholder
 *
 * A minimal service worker for PWA installability. This will be expanded
 * with caching strategies in a future ticket.
 */

self.addEventListener("install", () => {
  // Activate immediately — no precaching in the placeholder
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all clients so the SW takes effect immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy — pass through all requests for now
  event.respondWith(fetch(event.request));
});
