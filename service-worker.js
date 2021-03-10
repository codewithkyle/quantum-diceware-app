self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = "offline-cache-";
const version = "1.0.1";
const cacheName = `${cacheNamePrefix}${version}`;
const assets = [
    self.origin,
    "/main.js",
    "/css/accordion.css",
    "/css/buttons.css",
    "/css/input.css",
    "/css/link.css",
    "/css/normalize.css",
    "/css/select.css",
    "/css/snackbar.css",
    "/css/tooltip.css",
    "https://unpkg.com/brixi@0.3.3/brixi.min.css",
    "/manifest.webmanifest"
];

async function onInstall(event) {
    self.skipWaiting();
    const assetsRequests = assets.map(asset => new Request(asset, {redirect:"manual"}));
	for (const request of assetsRequests){
		await caches.open(cacheName).then(cache => cache.add(request)).catch(error => {
			console.error("Failed to cache:", request, error);
		});
	}
}

async function onActivate(event) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
}

async function onFetch(event) {
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        const shouldServeIndexHtml = event.request.mode === 'navigate';
        const request = shouldServeIndexHtml ? self.origin : event.request;
        const cache = await caches.open(cacheName);
        cachedResponse = await cache.match(request);
    }
    return cachedResponse || await fetch(event.request).then(async (response) => {
        const clone = response.clone();
        const cache = await caches.open(cacheName);
        await cache.put(event.request, clone);
        return response;
    });
}