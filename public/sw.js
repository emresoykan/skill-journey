// Skill Journey service worker: uygulamayı internetsiz açılır kılar ve rutin hatırlatmalarını gösterir.
// PRECACHE ve VERSION derlemede scripts/build-sw.mjs ile doldurulur (sitenin tüm dosyaları ve içerik özeti);
// yerel geliştirmede boş kalır, yalnız gezilen dosyalar saklanır.
const PRECACHE = /*__PRECACHE__*/[];
const VERSION = /*__VERSION__*/'dev';
const PREFIX = 'skill-journey-';
const CACHE = PREFIX + VERSION;
const NETWORK_TIMEOUT_MS = 4000;
const scope = () => self.registration.scope;
const inScope = path => new URL(path, scope()).href;

// Yeni sürümün dosyaları önceden indirilir. Biri inmezse kurulum yine tamamlanır (o dosya ilk kullanımda saklanır).
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => Promise.allSettled(PRECACHE.map(path => cache.add(inScope(path)))))
    .then(() => self.skipWaiting()));
});

// Eski sürümlerin önbelleği silinir. Kayıtlar önbellekte değil tarayıcı deposunda durduğu için etkilenmez.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// Adres → statik dışa aktarımdaki sayfa dosyası ("/skill-journey/growth" → "growth.html").
function pageFile(url) {
  const path = url.href.slice(scope().length).split(/[?#]/)[0].replace(/\/$/, '');
  return path ? (path.endsWith('.html') ? path : `${path}.html`) : 'index.html';
}

// Sayfalar önce internetten istenir (yeni sürüm hemen gelsin); yanıt gelmez ya da gecikirse saklanan sürüm açılır.
async function page(request) {
  const cache = await caches.open(CACHE);
  const fallback = async () => (await cache.match(request, { ignoreSearch: true }))
    ?? (await cache.match(inScope(pageFile(new URL(request.url)))))
    ?? (await cache.match(inScope('index.html')))
    ?? Response.error();
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    if (response.ok) { cache.put(request, response.clone()); return response; }
    const cached = await fallback();
    return cached.ok ? cached : response;
  } catch {
    return fallback();
  }
}

// Kod, görsel ve ses dosyaları adlarında içerik özeti taşır; saklanan sürüm kullanılır, yoksa indirilip saklanır.
async function asset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  // Yalnız bu sitenin GET istekleri; bildirim sunucusu gibi başka adreslere dokunulmaz.
  if (request.method !== 'GET' || !request.url.startsWith(scope())) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : asset(request));
});

// Web push: push-worker'dan gelen rutin hatırlatmasını gösterir, dokununca açık uygulamaya geçer ya da uygulamayı açar.
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
