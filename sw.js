const CACHE_NAME = 'buildcraft-3d-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  'https://unpkg.com/three@0.169.0/build/three.module.js',
  'https://unpkg.com/three@0.169.0/examples/jsm/controls/OrbitControls.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // External dependency caching is best-effort so an unpkg outage cannot prevent install.
    await Promise.all(APP_SHELL.map(async url => {
      try { await cache.add(new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' })); }
      catch (error) { console.warn('BuildCraft cache miss:', url, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('buildcraft-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).protocol === 'chrome-extension:') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && (new URL(request.url).origin === self.location.origin || new URL(request.url).hostname === 'unpkg.com')) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
