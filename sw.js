/* Cache limitado a esta aplicação e a este caminho de hospedagem. */
importScripts('brand.js?v=1.1.0');
const PREFIX = 'cgu-vistorias-' + new URL(self.registration.scope).pathname + '-';
const CACHE = PREFIX + CGU.version;
const FILES = ['./', 'index.html', 'app.css', 'brand.js', 'app.js', 'db.js', 'emission-snapshot.js', 'analytics.js', 'backup.js', 'report.js', 'manifest.webmanifest',
  'vendor/docx.iife.js', 'vendor/pdf-lib.min.js', 'assets/logo.png', 'assets/selo-cgu.svg',
  'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png', 'manual.html', 'manual.css',
  'docs/manual-usuario.pdf', 'docs/diagramas.html', 'docs/diagramas/uml.svg', 'docs/diagramas/bpmn.svg', 'docs/telas/obras.png', 'docs/telas/obra.png', 'docs/telas/dados.png',
  'docs/telas/fotos.png', 'docs/telas/legenda.png', 'docs/telas/marcacoes.png', 'docs/telas/constatacoes.png',
  'docs/telas/conclusao.png', 'docs/telas/emitir.png', 'docs/telas/painel.png', 'docs/telas/ajustes.png', 'docs/telas/backup.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(async c => {
  await Promise.all(FILES.map(file => {
    const url = new URL(file, self.registration.scope);
    return c.add(new Request(url, { cache: 'reload' }));
  }));
}).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(
  ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))
)).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const network = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(network.catch(() => {})); return hit; }
    try { return await network; } catch { return new Response('Conteúdo indisponível sem internet. Abra uma vez conectado.', {status:503}); }
  }));
});
