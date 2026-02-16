/*
 * VLEP Mission v3.8 - sw.js (Service Worker)
 * © 2025 Quentin THOMAS - Tous droits réservés
 *
 * Service Worker pour mode hors-ligne et installation PWA
 */

const CACHE_NAME='vlep-mission-v3.8-cache';
const urlsToCache=[
  '/',
  '/index.html',
  '/css/main.css',
  '/ap.js',
  '/state.js',
  '/database.js',
  '/icons.js',
  '/utils.js',
  '/terrain.js',
  '/prepa.js',
  '/export-excel.js',
  '/export-activite.js',
  '/search-echantillons.js',
  '/auto-save.js',
  '/drag-drop.js'
];

// Installation du service worker
self.addEventListener('install',function(event){
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      console.log('[SW] Mise en cache des fichiers');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate',function(event){
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(function(cacheNames){
      return Promise.all(
        cacheNames.map(function(cacheName){
          if(cacheName!==CACHE_NAME){
            console.log('[SW] Suppression ancien cache:',cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interception des requêtes (stratégie Cache First avec fallback)
self.addEventListener('fetch',function(event){
  event.respondWith(
    caches.match(event.request).then(function(response){
      // Cache hit - retourner la réponse du cache
      if(response){
        return response;
      }
      
      // Clone de la requête
      var fetchRequest=event.request.clone();
      
      return fetch(fetchRequest).then(function(response){
        // Vérifier si réponse valide
        if(!response||response.status!==200||response.type!=='basic'){
          return response;
        }
        
        // Clone de la réponse pour le cache
        var responseToCache=response.clone();
        
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(event.request,responseToCache);
        });
        
        return response;
      }).catch(function(){
        // En cas d'erreur réseau, retourner page hors-ligne
        if(event.request.destination==='document'){
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync',function(event){
  console.log('[SW] Synchronisation:',event.tag);
  if(event.tag==='sync-missions'){
    event.waitUntil(syncMissions());
  }
});

// Fonction de synchronisation des missions
async function syncMissions(){
  console.log('[SW] Synchronisation des missions...');
  // Cette fonction pourrait envoyer les données vers un serveur
  // Pour l'instant on ne fait rien car tout est en localStorage
  return Promise.resolve();
}

// Gestion des notifications
self.addEventListener('notificationclick',function(event){
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
