/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `budget-cache-${version}`;

const ASSETS = [...build, ...files, ...prerendered];
const ASSET_SET = new Set(ASSETS);

// Prerendered app shell, served instantly for navigations so the PWA paints
// the splash screen immediately instead of waiting for the SSR response.
const SHELL = '/shell';

// Navigations that must reach the server directly (auth code exchange, file
// downloads, server endpoints) — and /shell itself.
const SHELL_BYPASS = ['/auth/', '/export', '/notifications', '/shell'];

// One-shot escape hatch: the shell page requests this when its client-side
// boot fails while online (e.g. version skew right after a deploy).
let bypassOnce = false;

self.addEventListener('message', (event) => {
	if (event.data === 'shell-bypass-once') bypassOnce = true;
});

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

	// Navigation requests → serve the prerendered app shell instantly; the
	// shell boots the client router, which fetches the real page data.
	// No SSR HTML is ever cached (it contains user data and references
	// deploy-specific hashed assets that disappear after the next deploy).
	if (request.mode === 'navigate' && request.method === 'GET') {
		if (bypassOnce || SHELL_BYPASS.some((path) => url.pathname.startsWith(path))) {
			bypassOnce = false;
			return; // fall through to the network
		}
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_NAME);
				const shell = await cache.match(SHELL);
				if (shell) return shell;
				// Shell not cached yet (first visit, SW still installing) → network
				try {
					return await fetch(request);
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
