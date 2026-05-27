<script lang="ts">
	import "./layout.css";
	import Navbar from "$lib/components/Navbar.svelte";
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { onMount } from 'svelte';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children, data } = $props();

	onMount(() => {
		const el = document.getElementById('app-loading');
		if (!el) return;
		el.classList.add('fade-out');
		setTimeout(() => el.remove(), 280);
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
		notifications={data.notifications ?? []}
	/>

	<main class="mx-auto max-w-7xl px-1 py-4 pb-20 md:px-4 md:py-10 md:pb-10">
		{@render children()}
	</main>
</div>
