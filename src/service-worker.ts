/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `budget-cache-${version}`;

// Assets to precache: SvelteKit build output + static files
const ASSETS = [...build, ...files];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) return;

	// Skip Supabase API calls and SvelteKit internal routes — always network
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_app/data/')) return;

	// Static assets (build output + files) → cache-first
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => cached ?? fetch(request))
		);
		return;
	}

	// Navigation requests → network-first, fall back to cache
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(() => caches.match(request).then((cached) => cached ?? fetch(request)))
		);
		return;
	}
});

// ─── Phase 2: Push Notifications ─────────────────────────────────────────────
// Uncomment and implement when adding push notification support.
//
// self.addEventListener('push', (event) => {
//   const data = event.data?.json() ?? { title: 'Budget', body: '' };
//   event.waitUntil(
//     self.registration.showNotification(data.title, {
//       body: data.body,
//       icon: '/icon-192.png',
//       badge: '/icon-192.png',
//     })
//   );
// });
//
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   event.waitUntil(self.clients.openWindow('/'));
// });
