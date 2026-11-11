// Service worker：讓 App 可以加到主畫面，網路不穩時也能打開畫面
// 修改 App 檔案後，把版本號 +1，手機才會拿到新版
const VERSION = 'v4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './js/app.js',
  './js/db.js',
  './js/rules.js',
  './js/content.js',
  './js/util.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 自己網站的檔案：先抓網路上的新版，失敗才用快取。資料庫的請求不經過快取。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // no-cache：每次都向伺服器確認有沒有新版，避免手機一直用舊檔案
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
