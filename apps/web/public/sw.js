// Uninstaller Service Worker to clear any legacy Workbox caches
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    self.registration.unregister().then(function() {
      if ('caches' in self) {
        return caches.keys().then(function(names) {
          return Promise.all(names.map(function(name) { return caches.delete(name); }));
        });
      }
    })
  );
});
