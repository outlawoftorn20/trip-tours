/* Trip Tours service worker: keeps the player itself working with no internet.
   It only ever caches the player's own files. The audio and catalogue live elsewhere
   (the trip-tours-audio site) and go straight to the phone's storage, never into this cache. */
const CACHE = 'trip-tours-shell-v2';
const SCOPE_PATH = new URL(self.registration.scope).pathname;          // e.g. /trip-tours/
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('trip-tours-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Player files: serve from cache at once, refresh the cached copy in the background when online.
   Anything outside this app's own folder (the audio site, catalogue.json) is left alone. */
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(SCOPE_PATH)) return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(r, { ignoreSearch: true }).then(hit => {
        const net = fetch(r).then(resp => { if (resp && resp.ok) cache.put(r, resp.clone()); return resp; }).catch(() => null);
        return hit || net.then(resp => resp || cache.match('./index.html'));
      })
    )
  );
});
