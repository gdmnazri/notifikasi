const CACHE_NAME = 'pkpj-work-monitor-v26';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon-180.png',
  './app-icon-192.png',
  './app-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const count = Math.max(0, Number(data.count) || 0);
  const work = [];
  if (count > 0 && 'setAppBadge' in self.registration) work.push(self.registration.setAppBadge(count));
  if (count === 0 && 'clearAppBadge' in self.registration) work.push(self.registration.clearAppBadge());
  work.push(self.registration.showNotification(data.title || 'PKPJ Work Monitor', {
    body: data.body || 'Ada tugasan yang memerlukan perhatian.',
    icon: './app-icon-192.png',
    badge: './app-icon-192.png',
    data: { url: data.url || './' }
  }));
  event.waitUntil(Promise.all(work));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const openClient = list.find(client => 'focus' in client);
      return openClient ? openClient.focus() : clients.openWindow(target);
    })
  );
});
