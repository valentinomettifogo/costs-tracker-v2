/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `budget-cache-${version}`;

const ASSETS = [...build, ...files];
const ASSET_SET = new Set(ASSETS);

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
	if (ASSET_SET.has(url.pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => cached ?? fetch(request))
		);
		return;
	}

	// Navigation requests → network-first, cache successful responses for offline fallback
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_NAME);
				try {
					const response = await fetch(request);
					if (response.ok) cache.put(request, response.clone());
					return response;
				} catch {
					return (await cache.match(request)) ?? Response.error();
				}
			})()
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
