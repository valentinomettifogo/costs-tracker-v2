<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import Navbar from "$lib/components/Navbar.svelte";

	let { children, data } = $props();
	const currentPath = $derived(data.currentPath.split("?")[0]);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-base-200 text-base-content">
	<Navbar
		user={data.user}
		role={data.role}
		isAdmin={data.isAdmin}
		currentPath={data.currentPath}
	/>

	<main class="mx-auto max-w-7xl px-4 py-8 pb-28 md:py-10 md:pb-10">
		{@render children()}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100 md:hidden"
	>
		<ul
			class="grid h-16 items-stretch text-xs font-medium {data.user
				? 'grid-cols-4'
				: 'grid-cols-4'}"
		>
			<li>
				<a
					class={`flex h-full items-center justify-center ${currentPath === "/" ? "bg-primary text-primary-content" : "text-base-content/80"}`}
					href="/"
				>
					Home
				</a>
			</li>
			<li>
				<a
					class={`flex h-full items-center justify-center ${currentPath === "/statistic" ? "bg-primary text-primary-content" : "text-base-content/80"}`}
					href="/statistic"
				>
					Statistic
				</a>
			</li>
			<li>
				{#if data.user}
					<a
						class={`flex h-full items-center justify-center ${currentPath.startsWith("/spaces") ? "bg-primary text-primary-content" : "text-base-content/80"}`}
						href="/spaces"
					>
						Spaces
					</a>
				{:else}
					<a
						class={`flex h-full items-center justify-center ${currentPath === "/about" ? "bg-primary text-primary-content" : "text-base-content/80"}`}
						href="/about"
					>
						About
					</a>
				{/if}
			</li>
			<li>
				{#if data.isAdmin}
					<a
						class={`flex h-full items-center justify-center ${currentPath === "/admin" ? "bg-accent text-accent-content" : "text-accent"}`}
						href="/admin"
					>
						Admin
					</a>
				{:else if data.user}
					<a
						class={`flex h-full items-center justify-center ${currentPath === "/about" ? "bg-primary text-primary-content" : "text-base-content/80"}`}
						href="/about"
					>
						About
					</a>
				{:else}
					<a
						class={`flex h-full items-center justify-center ${currentPath === "/login" ? "bg-primary text-primary-content" : "text-base-content/80"}`}
						href={`/login?redirectTo=${encodeURIComponent(data.currentPath)}`}
					>
						Login
					</a>
				{/if}
			</li>
		</ul>
	</nav>
</div>
