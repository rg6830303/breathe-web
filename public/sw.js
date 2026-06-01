// Breathe Pickleball Service Worker
// Caches the app shell for offline support and fast repeat loads

const CACHE_NAME = "breathe-pb-v3";
const OFFLINE_URL = "/offline";

// Core app shell URLs to precache
const PRECACHE_URLS = [
  "/",
  "/book",
  "/about",
  "/gallery",
  "/contact",
  "/offline",
  "/manifest.json",
  "/breathe-logo.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: precache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for API routes, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API routes: network-only (never cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "You are offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
        .then((response) => response || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: cache-first, then network
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          // Cache successful GET responses for static assets
          if (
            response.ok &&
            (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|css|js)$/) ||
              url.pathname.startsWith("/_next/static/"))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Breathe Pickleball";
  const options = {
    body: data.body ?? "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url ?? "/" },
    vibrate: [100, 50, 100],
    actions: data.actions ?? [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click → focus or open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (c) => c.url === targetUrl && "focus" in c
        );
        return existing ? existing.focus() : clients.openWindow(targetUrl);
      })
  );
});
