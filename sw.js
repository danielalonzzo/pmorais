const CACHE_NAME = 'paulo-morais-pwa-v201';
const STATIC_DESTINATIONS = new Set([
  'style',
  'script',
  'image',
  'font',
  'audio',
  'video'
]);

async function cacheSuccessfulResponse(cache, request, response) {
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// Create the runtime cache without duplicating the initial page load.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(() => self.skipWaiting())
  );
});

// Remove previous app-shell versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('paulo-morais-pwa-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    // Preserve real HTTP statuses (404, 500, redirects, etc.). Only an actual
    // network failure should fall back to an offline copy.
    if (!response.ok) return response;
    return cacheSuccessfulResponse(cache, request, response);
  } catch (error) {
    const cachedResponse = await cache.match(request);
    const fallbackResponse = cachedResponse || await cache.match('/');
    return fallbackResponse || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkResponse = fetch(request)
    .then((response) => cacheSuccessfulResponse(cache, request, response));

  if (cachedResponse) {
    event.waitUntil(networkResponse.catch(() => undefined));
    return cachedResponse;
  }

  return networkResponse;
}

// Intercept only same-origin GET navigations and browser-declared static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isApiRequest =
    url.pathname.startsWith('/__/') ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.toLowerCase().endsWith('.json');
  if (isApiRequest) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
