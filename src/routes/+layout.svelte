<script lang="ts">
	import "./layout.css";
	import Navbar from "$lib/components/Navbar.svelte";

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
	{#if data.user}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<div class="min-h-screen bg-base-200 text-base-content">
	<Navbar
		user={data.user}
		role={data.role}
		isAdmin={data.isAdmin}
		currentPath={data.currentPath}
		notifications={data.notifications ?? []}
	/>

	<main class="mx-auto max-w-7xl px-4 pb-28 md:py-10 md:pb-10" style="padding-top: calc(env(safe-area-inset-top, 0px) + 0.5rem)">
		{@render children()}
	</main>
</div>

<style>
	@media (min-width: 768px) {
		main {
			padding-top: 2.5rem; /* md:py-10 = 2.5rem */
		}
	}
</style>
