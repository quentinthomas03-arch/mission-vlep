/*
 * VLEP Mission v3.8 - Service Worker
 * © 2025 Quentin THOMAS - Tous droits réservés
 * Cache-first strategy pour fonctionnement offline
 */

var CACHE_NAME = 'vlep-mission-v3.8';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/main.css',
  './js/state.js',
  './js/icons.js',
  './js/utils.js',
  './js/database.js',
  './js/prepa.js',
  './js/terrain.js',
  './js/quick.js',
  './js/export.js',
  './js/db-view.js',
  './js/render.js',
  './js/app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Installation : mise en cache de tous les assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installation v3.8');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activation v3.8');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Suppression ancien cache:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch : cache-first, fallback réseau
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Mettre en cache les nouvelles ressources
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
