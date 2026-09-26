// sw.js - enkel offline-cache, slik at spillet virker uten nett paa nettbrettet.
const CACHE = 'robot-monstre-v4';
const FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/game.js',
  './js/art.js',
  './js/core.js',
  './js/content.js',
  './js/ui.js',
  './js/sprites.js',
  './js/rigs.js',
  './js/skrift.js',
  './js/ramme.js',
  './icon.svg',
  './manifest.webmanifest',
  // knappene, ikonene, rammen og fonten - uten dem ser menyene uferdige ut uten nett
  './art/grafikk/knapp-spill.png',
  './art/grafikk/knapp-spill-trykk.png',
  './art/grafikk/knapp-highscore.png',
  './art/grafikk/knapp-highscore-trykk.png',
  './art/grafikk/knapp-lyd.png',
  './art/grafikk/knapp-lyd-trykk.png',
  './art/grafikk/knapp-lyd-av.png',
  './art/grafikk/knapp-fullskjerm.png',
  './art/grafikk/knapp-fullskjerm-trykk.png',
  './art/grafikk/knapp-fortsett.png',
  './art/grafikk/knapp-fortsett-trykk.png',
  './art/grafikk/knapp-hjem.png',
  './art/grafikk/knapp-hjem-trykk.png',
  './art/grafikk/knapp-igjen.png',
  './art/grafikk/knapp-pause.png',
  './art/grafikk/ikon-stjerne.png',
  './art/grafikk/ikon-hodeskalle.png',
  './art/grafikk/logo.png',
  './art/grafikk/ramme/hjorne-oppe-venstre.png',
  './art/grafikk/ramme/kant-oppe.png',
  './art/grafikk/ramme/hjorne-oppe-hoyre.png',
  './art/grafikk/ramme/kant-venstre.png',
  './art/grafikk/ramme/midt.png',
  './art/grafikk/ramme/kant-hoyre.png',
  './art/grafikk/ramme/hjorne-nede-venstre.png',
  './art/grafikk/ramme/kant-nede.png',
  './art/grafikk/ramme/hjorne-nede-hoyre.png',
  './art/grafikk/ramme/ramme.json',
  './art/font/spillfont.png',
  './art/font/spillfont.json',
  './art/font/Spillfont.ttf',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Bare lagre svar som faktisk virket. Lagrer vi en 404 vil en PNG du
        // legger inn senere aldri dukke opp.
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
