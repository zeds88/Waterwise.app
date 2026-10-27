// Offline-capable without ever pinning users to an old build:
//  - page loads: network first (fresh deploys show up immediately), cache only as offline fallback
//  - hashed /assets/*: cache first (content-addressed, safe to keep forever)
//  - everything else same-origin: stale-while-revalidate
const CACHE = 'jobcam-v2'
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  e.respondWith((async () => {
    const cache = await caches.open(CACHE)
    if (req.mode === 'navigate') {
      try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res } catch { return (await cache.match(req)) || (await cache.match('./')) || Response.error() }
    }
    const hit = await cache.match(req)
    if (hit && url.pathname.includes('/assets/')) return hit
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res }).catch(() => hit)
    return hit || net
  })())
})
