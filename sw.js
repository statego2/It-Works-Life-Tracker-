// Static shell cache only. Sensitive workspace data is NOT cached by the service worker.
const CACHE = 'itworks-shell-v8-iphone';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=20261103-iphone-v8',
  './src/app.js?v=20261103-iphone-v8',
  './src/domain.js?v=20261103-iphone-v8',
  './src/domain.js',
  './src/storage.js?v=20261103-iphone-v8',
  './src/backup.js?v=20261103-iphone-v8',
  './src/backup.js',
  './src/vision.js?v=20261103-iphone-v8',
  './src/vision.js',
  './src/persist.js?v=20261103-iphone-v8',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './manifest.webmanifest'
];
self.addEventListener('install', event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch', event=>{
  const url = new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const isShell=ASSETS.some(asset=>new URL(asset,self.registration.scope).href===url.href);
  if(!isShell)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
