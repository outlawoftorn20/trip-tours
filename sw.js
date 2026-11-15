'use strict';
/* Trip Tours service worker (v0.3).
   Keeps only the app shell (page, manifest, icons) so the app opens offline.
   Audio and catalogue.json are never handled here: they live in a different folder
   (../trip-tours-audio/) and in IndexedDB, so nothing big ever lands in Cache Storage.
   The shell is fetched network-first, so a new index.html is picked up as soon as the phone is online. */
var CACHE = 'trip-tours-shell-v3';
var SCOPE = new URL(self.registration.scope).pathname;            // e.g. /trip-tours/
var SHELL = ['', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map(function (p) { return SCOPE + p; });

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return fetch(u, { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k.indexOf('trip-tours-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (SHELL.indexOf(u.pathname) < 0) return;                       // not part of the shell: leave it alone
  e.respondWith(
    fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(u.pathname, copy); }); }
      return r;
    }).catch(function () {
      return caches.match(u.pathname).then(function (m) { return m || caches.match(SCOPE + 'index.html'); });
    })
  );
});
