// =============================================================================
// SERVICE WORKER - działanie offline (cache logiki klienta i grafik)
// Wersja cache pochodzi z js/about-content.js - przy wydaniu nie trzeba
// zmieniać tego pliku. Przeglądarka wykrywa zmianę importowanego skryptu
// i instaluje nowy cache automatycznie.
// =============================================================================

// about-content.js zapisuje dane do window.ABOUT_CONTENT, a w workerze nie ma window
self.window = self;
importScripts('js/about-content.js');

const CACHE_PREFIX = 'pmc-';
const CACHE_NAME = CACHE_PREFIX + self.ABOUT_CONTENT.version;

// Logika klienta - serwowana "najpierw sieć", żeby online zawsze była świeża
const APP_FILES = [
    './',
    'index.html',
    'manifest.json',
    'css/common.css',
    'css/skins/classic.css',
    'css/skins/teleexpress.css',
    'css/skins/tvp-1993.css',
    'css/skins/tvp-2012.css',
    'css/skins/tvp-krakow.css',
    'js/about-content.js',
    'js/ntp-sync.js',
    'js/clock-manager.js',
    'js/skins/classic-clock.js',
    'js/skins/teleexpress-clock.js',
    'js/skins/tvp-1993-clock.js',
    'js/skins/tvp-2012-clock.js',
    'js/skins/tvp-krakow-clock.js'
];

// Grafiki i czcionki - serwowane "najpierw cache" (nie zmieniają się między wersjami)
const ASSET_FILES = [
    'fonts/DigiClock.woff2',
    'fonts/DigiClock.woff',
    'assets/favicon.ico',
    'assets/favicon-16x16.png',
    'assets/favicon-32x32.png',
    'assets/apple-touch-icon.png',
    'assets/icon-192.png',
    'assets/icon-512.png',
    'clock-assets/classic/background.webp',
    'clock-assets/classic/face.webp',
    'clock-assets/classic/hand-hour.webp',
    'clock-assets/classic/hand-minute.webp',
    'clock-assets/classic/hand-second.webp',
    'clock-assets/tvp-1993/background.webp',
    'clock-assets/tvp-1993/background-nologo.webp',
    'clock-assets/tvp-1993/hand-hour.webp',
    'clock-assets/tvp-1993/hand-minute.webp',
    'clock-assets/tvp-1993/hand-second.webp',
    'clock-assets/tvp-2012/background.webp',
    'clock-assets/tvp-2012/face.webp',
    'clock-assets/tvp-2012/hand-hour.webp',
    'clock-assets/tvp-2012/hand-minute.webp',
    'clock-assets/tvp-2012/hand-second.webp',
    'clock-assets/tvp-krakow/background.webp',
    'clock-assets/tvp-krakow/hand-hour.webp',
    'clock-assets/tvp-krakow/hand-minute.webp',
    'clock-assets/tvp-krakow/hand-second.webp'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Każdy plik osobno - brak jednego pliku nie blokuje instalacji całości
        const results = await Promise.allSettled(
            [...APP_FILES, ...ASSET_FILES].map(url => cache.add(new Request(url, { cache: 'reload' })))
        );
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.warn('[SW] Nie udało się zapisać w cache:', [...APP_FILES, ...ASSET_FILES][i]);
            }
        });
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Usuń cache poprzednich wersji
        const keys = await caches.keys();
        await Promise.all(
            keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

// Klucz cache bez parametrów (?kiosk=1, ?v=... dodawane przy ładowaniu skórek)
function cacheKey(request) {
    const url = new URL(request.url);
    url.search = '';
    return url.href;
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(cacheKey(request), response.clone());
        }
        return response;
    } catch (err) {
        const cached = await cache.match(cacheKey(request));
        if (cached) return cached;
        // Nawigacja offline na nieznany adres - zwróć stronę główną
        if (request.mode === 'navigate') {
            const index = await cache.match(new URL('index.html', self.registration.scope).href);
            if (index) return index;
        }
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey(request));
    if (cached) return cached;

    // Np. PNG/JPG pobierane przez przeglądarki bez obsługi WebP - zapisz po pierwszym użyciu
    const response = await fetch(request);
    if (response.ok) {
        cache.put(cacheKey(request), response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Zapytania do innych domen (backend czasu, WorldTimeAPI) zawsze idą do sieci -
    // wzorzec czasu z cache byłby bezwartościowy
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    const isAsset = /\.(webp|png|jpe?g|ico|woff2?|ttf|eot|svg)$/i.test(url.pathname);
    event.respondWith(isAsset ? cacheFirst(request) : networkFirst(request));
});
