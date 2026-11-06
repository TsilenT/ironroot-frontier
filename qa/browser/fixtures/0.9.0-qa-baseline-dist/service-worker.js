// Atomic, versioned offline shell. Bump VERSION with every public build.
const VERSION = 'ironroot-v0.9.0';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './FONTS-NOTICES.txt',
  './barlow-condensed-latin-500.woff2',
  './barlow-condensed-latin-600.woff2',
  './barlow-condensed-latin-700.woff2',
  './barlow-condensed-latin-800.woff2',
  './dm-sans-latin-400-700.woff2',
  './app.js',
  './backup.js',
  './profile-session.js',
  './controller.js',
  './engine.js',
  './render.js',
  './codex.js',
  './challenges.js',
  './campaign.js',
  './objectives.js',
  './persistence.js',
  './audio.js',
  './vfx.js',
  './icon.svg',
  './manifest.webmanifest',
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ironroot-') && k !== VERSION)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .open(VERSION)
        .then((cache) => cache.match('./index.html'))
        .then((cached) => cached || fetch(request)),
    );
    return;
  }
  event.respondWith(
    caches
      .open(VERSION)
      .then((cache) => cache.match(request))
      .then((cached) => cached || fetch(request)),
  );
});
