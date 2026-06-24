<script lang="ts">
	import "./layout.css";
	import Navbar from "$lib/components/Navbar.svelte";
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children, data } = $props();

	const SPLASH_FADE_MS = 280;
	const SPLASH_FAILSAFE_MS = 8000;

	function hideSplash() {
		const el = document.getElementById('app-loading');
		if (!el) return;
		el.classList.add('fade-out');
		setTimeout(() => el.remove(), SPLASH_FADE_MS);
	}

	// SSR boot: fires once after hydration on the real page.
	// PWA shell boot: fires on the shell (skipped), then again when the shell's
	// goto() lands on the real page with its data — splash stays up until then.
	afterNavigate((nav) => {
		if (nav.to?.route.id === '/shell') return;
		hideSplash();
	});

	onMount(() => {
		// Failsafe: never trap the user behind the splash.
		const timer = setTimeout(hideSplash, SPLASH_FAILSAFE_MS);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	{#if data.user}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<div class="min-h-screen bg-base-200 text-base-content">
	<Navbar
		user={data.user}
		role={data.role}
		currentPath={data.currentPath}
		notifications={data.notifications}
	/>

	<main class="mx-auto max-w-7xl px-1 py-4 pb-20 md:px-4 md:py-10 md:pb-10">
		{@render children()}
	</main>
</div>
