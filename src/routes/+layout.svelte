<script lang="ts">
	import "./layout.css";
	import Navbar from "$lib/components/Navbar.svelte";

	let { children, data } = $props();
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
		isAdmin={data.isAdmin}
		currentPath={data.currentPath}
		notifications={data.notifications ?? []}
	/>

	<main class="mx-auto max-w-7xl px-1 py-8 pb-28 md:px-4 md:py-10 md:pb-10">
		{@render children()}
	</main>
</div>
