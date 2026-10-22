// Web push service worker: push-worker'dan gelen rutin hatırlatmasını gösterir,
// dokununca açık uygulamaya geçer ya da uygulamayı açar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Skill Journey', {
    body: data.body,
    icon: data.icon,
    tag: data.tag,
    data: { url: data.url || self.registration.scope },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const open = windows.find(client => client.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
