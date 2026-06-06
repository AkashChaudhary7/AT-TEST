/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'prepguru-offline-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Intercept same-origin requests
  if (requestUrl.origin === self.location.origin) {
    if (requestUrl.pathname.startsWith('/api/')) {
      // Network-First strategy with friendly JSON fallbacks for API endpoints
      event.respondWith(
        fetch(event.request)
          .catch(async (err) => {
            console.log('[Service Worker] Offline Intercept on API route:', requestUrl.pathname, err);
            
            if (requestUrl.pathname === '/api/generate-mcqs-from-doc') {
              return new Response(JSON.stringify({
                success: true,
                isOfflineFallback: true,
                questions: [],
                message: "Offline Mode Active: Your question pool remains fully persistent. New generations will restore upon reconnecting!"
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }

            if (requestUrl.pathname === '/api/ai-autofill-mcq') {
              return new Response(JSON.stringify({
                success: true,
                isOfflineFallback: true,
                draft: null,
                message: "Working Offline: Draft helper requires active internet connections."
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }

            return new Response(JSON.stringify({
              error: 'Connection Lost: Check your local network state. Study materials are offline accessible!',
              isOffline: true
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          })
      );
    } else {
      // Stale-While-Revalidate for app assets, resources, styles, and modules
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.match(event.request).then((cachedResponse) => {
            const fetchedResponse = fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            }).catch(() => {
              // Ignore offline fetch errors for static assets already cached
            });

            return cachedResponse || fetchedResponse;
          });
        })
      );
    }
  }
});
