const CACHE = 'oslo-days-v9';
const ASSETS = ['./', './index.html', './spots.html', './evening.html', './qr.js',
  './img/map.jpg', './img/oslo-s.jpg', './img/dombas.jpg', './img/andalsnes.jpg',
  './img/geiranger-stop.jpg', './img/trollstigen.jpg', './img/gudbrandsjuvet.jpg',
  './img/romsdalen.jpg', './img/geiranger-view.jpg', './img/fjord-farm.jpg', './img/alesund.jpg', './infographic.html', './jul4.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first with cache fallback; never cache error responses
// (githack rate-limit pages must not poison the offline copy)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }
      // bad gateway / rate-limited: prefer the good cached copy if we have one
      return caches.match(e.request, { ignoreSearch: true }).then(hit => hit || res);
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
