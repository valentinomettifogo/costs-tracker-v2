<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	const currentPath = $derived(data.currentPath.split('?')[0]);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-base-200 text-base-content">
	<nav class="border-b border-base-300 bg-base-100/90 backdrop-blur">
		<div class="navbar mx-auto max-w-6xl px-4">
			<div class="navbar-start">
				<a class="btn btn-ghost text-lg font-semibold" href="/">Costs Tracker</a>
			</div>

			<div class="navbar-center hidden md:flex">
				<ul class="menu menu-horizontal gap-2 px-1">
					<li><a href="/">Home</a></li>
					<li><a href="/statistic">Statistic</a></li>
					{#if data.user}
						<li><a href="/spaces">Spaces</a></li>
					{/if}
					<li><a href="/about">About</a></li>
					{#if data.isAdmin}
						<li>
							<a
								class={`${currentPath === '/admin' ? 'bg-accent text-accent-content' : 'text-accent hover:bg-accent/15'}`}
								href="/admin"
							>
								Admin
							</a>
						</li>
					{/if}
				</ul>
			</div>

			<div class="navbar-end gap-2">
				{#if data.user}
					<div class="hidden text-right text-sm md:block">
						<p class="font-medium">{data.user.email}</p>
						<p class="text-base-content/60">{data.role ?? 'authenticated user'}</p>
					</div>
					<form method="POST" action="/login?/logout">
						<button class="btn btn-outline btn-sm min-h-11" type="submit">Logout</button>
					</form>
				{:else}
					<a class="btn btn-primary btn-sm min-h-11" href={`/login?redirectTo=${encodeURIComponent(data.currentPath)}`}>
						Login
					</a>
				{/if}
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-4xl px-4 py-8 pb-28 md:py-10 md:pb-10">
		{@render children()}
	</main>

	<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100 md:hidden">
		<ul class="grid h-16 items-stretch text-xs font-medium {data.user ? 'grid-cols-4' : 'grid-cols-4'}">
			<li>
				<a
					class={`flex h-full items-center justify-center ${currentPath === '/' ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
					href="/"
				>
					Home
				</a>
			</li>
			<li>
				<a
					class={`flex h-full items-center justify-center ${currentPath === '/statistic' ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
					href="/statistic"
				>
					Statistic
				</a>
			</li>
			<li>
				{#if data.user}
					<a
						class={`flex h-full items-center justify-center ${currentPath.startsWith('/spaces') ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
						href="/spaces"
					>
						Spaces
					</a>
				{:else}
					<a
						class={`flex h-full items-center justify-center ${currentPath === '/about' ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
						href="/about"
					>
						About
					</a>
				{/if}
			</li>
			<li>
				{#if data.isAdmin}
					<a
						class={`flex h-full items-center justify-center ${currentPath === '/admin' ? 'bg-accent text-accent-content' : 'text-accent'}`}
						href="/admin"
					>
						Admin
					</a>
				{:else if data.user}
					<a
						class={`flex h-full items-center justify-center ${currentPath === '/about' ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
						href="/about"
					>
						About
					</a>
				{:else}
					<a
						class={`flex h-full items-center justify-center ${currentPath === '/login' ? 'bg-primary text-primary-content' : 'text-base-content/80'}`}
						href={`/login?redirectTo=${encodeURIComponent(data.currentPath)}`}
					>
						Login
					</a>
				{/if}
			</li>
		</ul>
	</nav>
</div>
