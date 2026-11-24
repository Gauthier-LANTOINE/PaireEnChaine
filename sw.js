/* ===== Paire en Chaîne — service worker (mode hors-ligne) ===== */
'use strict';

const VERSION = 'paire-en-chaine-v2';
const CACHE_APP = VERSION + '.app';         // app shell + paquet complet (préchargés)
const CACHE_RUNTIME = VERSION + '.runtime'; // autres ressources (mise en cache à la volée)

/* Le paquet de cartes est préchargé en entier : le jeu est jouable 100 % hors-ligne. */
const DOSSIER_ASSETS = 'Pixel Playing Cards - Asset Pack/';
const VALEURS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
const FAMILLES = ['spades', 'hearts', 'diamonds', 'clubs'];

const CARTES = [];
for (const f of FAMILLES) {
  for (const v of VALEURS) CARTES.push(DOSSIER_ASSETS + v + '_of_' + f + '.png');
}
CARTES.push(DOSSIER_ASSETS + 'joker.png');
CARTES.push(DOSSIER_ASSETS + 'blue_backing.png');

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then((cache) => cache.addAll(APP_SHELL.concat(CARTES)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(
        cles
          .filter((k) => k.indexOf('paire-en-chaine-') === 0 && k !== CACHE_APP && k !== CACHE_RUNTIME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Navigations : réseau d'abord, repli sur la page en cache (hors-ligne)
  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE_APP).then((cache) => cache.put('./index.html', copie));
          }
          return reponse;
        })
        .catch(() =>
          caches.match('./index.html').then((enCache) =>
            enCache || new Response('Paire en Chaîne n’est pas disponible hors-ligne.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        )
    );
    return;
  }

  // Fichiers de l'application (JS/CSS/HTML) : réseau d'abord pour toujours
  // servir la dernière version, repli sur le cache quand on est hors-ligne.
  if (/\.(js|css|html|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE_APP).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        })
        .catch(() =>
          caches.match(requete).then((enCache) =>
            enCache || new Response('Hors-ligne : ressource introuvable.', { status: 503 })
          )
        )
    );
    return;
  }

  // Images et autres ressources : cache d'abord, sinon réseau puis mise en cache
  event.respondWith(
    caches.match(requete).then((enCache) => {
      if (enCache) return enCache;
      return fetch(requete).then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE_RUNTIME).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      });
    })
  );
});
