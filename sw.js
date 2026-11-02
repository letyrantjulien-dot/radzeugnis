/* Radzeugnis Service Worker v7
   — Eigene Dateien (App-Hülle): NETZ ZUERST, Cache nur als Rückfall.
     So kommt jede neue Version sofort an; offline gibt es die letzte.
   — Kacheln, Schriften, Bibliotheken: Cache zuerst (ändern sich nie).
   — /api/ läuft immer über das Netz. */
const CACHE = 'radzeugnis-v8';
const STATISCH = [
  'https://tiles.openfreemap.org'
];

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for(const k of await caches.keys()){
    if(k !== CACHE) await caches.delete(k); // alte (klebrige) Caches räumen
  }
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.pathname.startsWith('/api/')) return;

  // Der Datenabzug landet ohnehin in der Datenbank: nicht doppelt lagern.
  if(url.pathname.endsWith('/netz-berlin.json')) return;

  // Eigene Schriften und die versionierte Kartenbibliothek ändern sich nie.
  if(url.origin === self.location.origin &&
     (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/lib/'))){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const treffer = await cache.match(e.request);
      if(treffer) return treffer;
      const antwort = await fetch(e.request);
      if(antwort.ok) cache.put(e.request, antwort.clone());
      return antwort;
    })());
    return;
  }

  // App-Hülle: Netz zuerst
  if(url.origin === self.location.origin){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try{
        const antwort = await fetch(e.request);
        if(antwort.ok) cache.put(e.request, antwort.clone());
        return antwort;
      }catch(fehler){
        const treffer = await cache.match(e.request);
        return treffer || Response.error();
      }
    })());
    return;
  }

  // Statische Fremdquellen: Cache zuerst
  if(STATISCH.includes(url.origin)){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const treffer = await cache.match(e.request);
      if(treffer) return treffer;
      try{
        const antwort = await fetch(e.request);
        if(antwort.ok && (antwort.type === 'basic' || antwort.type === 'cors')){
          cache.put(e.request, antwort.clone());
        }
        return antwort;
      }catch(fehler){
        return Response.error();
      }
    })());
  }
});
