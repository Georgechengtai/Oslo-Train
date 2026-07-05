const CACHE = 'triphelper-v1';
const ASSETS = ['./', './index.html', './app.js',
  './vendor/lz-string.min.js', './vendor/qrcode.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// network-first for the shell, never cache errors; cache fallback offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }
      return caches.match(e.request, { ignoreSearch: true }).then(hit => hit || res);
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
