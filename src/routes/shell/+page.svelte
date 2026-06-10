<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let offline = $state(false);

	function removeSplash() {
		document.getElementById('app-loading')?.remove();
	}

	onMount(async () => {
		// The service worker serves this prerendered shell for every navigation,
		// so the address bar holds the URL the user actually requested. Route
		// there client-side: the router fetches the real page data from the
		// server (following redirects, e.g. to /login when logged out).
		const target =
			location.pathname === '/shell' ? '/' : `${location.pathname}${location.search}`;
		try {
			// invalidateAll is REQUIRED: the browser URL already matches `target`,
			// so without it the router sees "same URL" and keeps the prerendered
			// layout data (user:null) — the navbar would show a logged-out state
			// for logged-in users and /login would silently bounce back.
			await goto(target, { replaceState: true, invalidateAll: true });
		} catch {
			if (!navigator.onLine) {
				offline = true;
				removeSplash();
				return;
			}
			// Online but the client-side boot failed (e.g. version skew right
			// after a deploy): ask the service worker to let one navigation
			// through to the server, then reload. Guarded to fire at most once.
			if (!sessionStorage.getItem('shell-bypass-used')) {
				sessionStorage.setItem('shell-bypass-used', '1');
				navigator.serviceWorker?.controller?.postMessage('shell-bypass-once');
				location.reload();
				return;
			}
			offline = true;
			removeSplash();
		}
	});
</script>

{#if offline}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
		<h1 class="text-xl font-semibold text-gray-900">You're offline</h1>
		<p class="text-sm text-gray-500">Check your connection and try again.</p>
		<button
			type="button"
			class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
			onclick={() => location.reload()}
		>
			Retry
		</button>
	</div>
{/if}
