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

// ─── Push Notifications ──────────────────────────────────────────────────────

interface PushPayload {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
	badgeCount?: number;
}

const NOTIFICATION_ICON = '/icons/web-app-manifest-192x192.png';

self.addEventListener('push', (event) => {
	let data: PushPayload = {};
	try {
		data = (event.data?.json() as PushPayload) ?? {};
	} catch {
		// malformed payload — still show a generic notification (required on iOS)
	}

	const tasks: Promise<unknown>[] = [
		self.registration.showNotification(data.title ?? 'Bloom Budget', {
			body: data.body ?? '',
			tag: data.tag,
			icon: NOTIFICATION_ICON,
			badge: NOTIFICATION_ICON,
			data: { url: data.url ?? '/' }
		})
	];

	if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
		tasks.push(self.navigator.setAppBadge(data.badgeCount).catch(() => undefined));
	}

	event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url: string = event.notification.data?.url ?? '/';

	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const existing = windows[0];
			if (existing) {
				await existing.focus();
				if (new URL(existing.url).pathname !== url) {
					// navigate() can reject (e.g. iOS) — focusing is enough then
					await existing.navigate(url).catch(() => undefined);
				}
				return;
			}
			await self.clients.openWindow(url);
		})()
	);
});
