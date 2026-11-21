/* PS SHOP — сервис-воркер: повторный заход открывается из памяти телефона.
   Страницы: сначала сеть (свежие цены), если сеть медленнее 3 с или её нет — сохранённая копия.
   Стили, скрипты, шрифты, обложки: сразу из памяти, в фоне обновляются. */
// Имя кэша постоянное: файлы с ?v= при новой версии сайта получают новый адрес, старая копия того же файла удаляется.
const CACHE = 'psshop-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('psshop-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => {
  if (res && res.ok && res.type === 'basic') {
    const c = res.clone();
    caches.open(CACHE).then(async (x) => {
      const u = new URL(req.url);
      if (u.searchParams.has('v')) for (const k of await x.keys()) { const o = new URL(k.url); if (o.pathname === u.pathname && o.search !== u.search) x.delete(k); }
      x.put(req, c);
    });
  }
  return res;
};
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const net = fetch(req).then((r) => put(req, r));
      const cached = await caches.match(req);
      if (!cached) return net.catch(() => caches.match('/'));
      const slow = new Promise((ok) => setTimeout(() => ok(cached), 3000));
      return Promise.race([net.catch(() => cached), slow]);
    })());
    return;
  }
  if (url.pathname === '/static/catalog.json') { e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req))); return; }
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(caches.match(req).then((c) => { const net = fetch(req).then((r) => put(req, r)).catch(() => c); return c || net; }));
  }
});
