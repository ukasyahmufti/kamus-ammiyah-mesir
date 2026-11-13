const CACHE_NAME = 'kamus-ammiyah-v2';
const ASSETS = [
  './',
  './index.html',
  './kamus.json',
  './manifest.json',
  './assets/icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Kunci cache tanpa query string, supaya ?v=... tetap menemukan salinan offline.
function cacheKey(request) {
  const url = new URL(request.url);
  url.search = '';
  return url.href;
}

// Network-first: pembaruan langsung terlihat saat online; cache dipakai saat offline.
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(cacheKey(request), copy));
      }
      return response;
    })
    .catch(() => caches.match(cacheKey(request), { ignoreSearch: true }));
}

// Cache-first untuk aset statis lokal.
function cacheFirst(request) {
  return caches.match(cacheKey(request), { ignoreSearch: true })
    .then(cached => cached || fetch(request));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // font & CDN lewat jaringan biasa

  const path = url.pathname;
  const isDocOrData = path.endsWith('/') || path.endsWith('.html') ||
                      path.endsWith('.json');

  event.respondWith(isDocOrData ? networkFirst(request) : cacheFirst(request));
});
