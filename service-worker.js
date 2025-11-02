const CACHE_NAME = 'jdr-dashboard-v2'; // Nouveau nom pour forcer la MAJ

const APP_FILES_TO_CACHE = [
  './', 
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon-512.png',
  'dragon-bg.jpg' // NOUVEAU FOND
];

// --- Événement d'installation ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert. Ajout des fichiers de l\'application...');
        return cache.addAll(APP_FILES_TO_CACHE);
      })
  );
});

// --- Événement "fetch" ---
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      }
    )
  );
});

// --- Événement d'activation (Nettoyage) ---
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Suppression de l'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

});





