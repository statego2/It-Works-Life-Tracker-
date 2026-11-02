// Static shell cache only. Sensitive workspace data is NOT cached by the service worker.
const CACHE = 'itworks-shell-v3-compact';
const ASSETS = ['./','./index.html','./styles.css?v=20261102-compact-v2','./src/app.js?v=20261102-compact-v2','./src/domain.js?v=20261102-compact-v2','./src/storage.js?v=20261102-compact-v2','./icons/icon.svg','./manifest.webmanifest'];
self.addEventListener('install', event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch', event=>{
  const url = new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const isShell=ASSETS.some(asset=>new URL(asset,self.registration.scope).href===url.href);
  if(!isShell)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
