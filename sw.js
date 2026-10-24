// sw.js - Service Worker
// © 2025 Quentin THOMAS

const CACHE_NAME = 'vlep-mission-v2.49';
const VERSION = '2.49'; // Incrémenter à chaque mise à jour
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Icônes (à la racine, noms réels d'après index.html / manifest.json)
  './favicon.svg',
  './favicon-96x96.png',
  './favicon.ico',
  './apple-touch-icon.png',
  './web-app-manifest-192x192.png',
  './web-app-manifest-512x512.png',
  // Modules JavaScript (dossier js/)
  './js/icons.js',
  './js/database.js',
  './js/scola-listes.js',
  './js/state.js',
  './js/prepa.js',
  './js/terrain.js',
  './js/consignes-agents.js',
  './js/releves-analyseur.js',
  './js/echantillons.js',
  './js/jszip.min.js',
  './js/xlsm-moteur.js',
  './js/docx-moteur.js',
  './js/feuille-calcul.js',
  './js/veolia.js',
  './js/scola-dossier.js',
  './js/rapport.js',
  './js/rapport-resultats.js',
  './modele/feuille-calcul-vlep.xlsm',
  './modele/trame-rapport-vlep.docx',
  './js/database-views.js',
  './js/quick-entry.js',
  './js/import-export.js',
  './js/fusion-missions.js',
  './js/envoi-mail.js',
  './js/nouveautes.js',
  './js/guide.js',
  './js/fiche-supports.js',
  './js/regroupement.js',
  './js/reprise-ancien.js',
  './js/scola-geh.js',
  './js/tournee.js',
  './js/scola-dispositifs.js',
  './js/timers.js',
  './js/activite.js',
  './js/app.js',
];

// Installation
self.addEventListener('install', function(event) {
  console.log('[SW] Installation v' + VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Mise en cache des fichiers');
        // Mise en cache résiliente : chaque fichier est mis en cache individuellement.
        // Si l'un échoue (absent, mal nommé), il est ignoré au lieu de faire échouer
        // TOUTE la mise en cache (ce qui casserait le fonctionnement hors-ligne).
        return Promise.all(urlsToCache.map(function(url) {
          // cache: reload : jamais la copie du cache HTTP du navigateur (sinon anciens fichiers après une mise à jour)
          return cache.add(new Request(url, { cache: 'reload' })).catch(function(err) {
            console.warn('[SW] Fichier ignoré (non mis en cache):', url, err);
          });
        }));
      })
      .then(function() {
        console.log('[SW] Tous les fichiers mis en cache avec succès');
        return self.skipWaiting(); // Active immédiatement
      })
      .catch(function(err){
        console.error('[SW] Erreur mise en cache:', err);
      })
  );
});

// Activation
self.addEventListener('activate', function(event) {
  console.log('[SW] Activation v' + VERSION);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(function() {
      console.log('[SW] Prise de contrôle des clients');
      return self.clients.claim(); // Prend le contrôle immédiatement
    })
    .then(function() {
      // Notifier tous les clients qu'une mise à jour est disponible
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: VERSION
          });
        });
      });
    })
  );
});

// Fetch - Stratégie Network First pour le développement
self.addEventListener('fetch', function(event) {
  // Seules les requêtes GET passent par le cache (la vérification du modèle se fait en HEAD)
  if (event.request.method !== 'GET') return;
  event.respondWith(
    // no-cache : le navigateur revérifie auprès du serveur au lieu de resservir sa copie (GitHub Pages : 10 min)
    // (une navigation ne peut pas être recopiée avec des options : requête refaite d'après son adresse)
    fetch(event.request.mode === 'navigate' ? new Request(event.request.url, { cache: 'no-cache' }) : new Request(event.request, { cache: 'no-cache' }))
      .then(function(response) {
        // Si la requête réseau réussit, mettre en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(function() {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request);
      })
  );
});

console.log('[SW] Service Worker chargé v' + VERSION);
