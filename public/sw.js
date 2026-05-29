// Service Worker — Gestión de Barberia PWA
// Estrategia: Network-First con fallback a caché para assets estáticos

const CACHE_NAME = 'barberia-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Instalación: pre-cachear assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Si falla el caché, continuar de todos modos
        return self.skipWaiting();
      })
  );
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-First para todo
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requests que no son GET
  if (event.request.method !== 'GET') return;

  // Ignorar APIs de Google (OAuth, Drive) — siempre van a la red
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('google.com')
  ) return;

  // Ignorar HMR y webpack dev en desarrollo
  if (
    url.pathname.includes('_next/webpack') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('__nextjs')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // Cachear una copia
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Sin red: intentar desde caché
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Para navegación, devolver la página principal (SPA offline)
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
