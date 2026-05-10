<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';

	interface Props {
		user: { email?: string; user_metadata?: Record<string, unknown> } | null;
		role: string | null;
		isAdmin: boolean;
		currentPath: string;
	}

	let { user, role, isAdmin, currentPath }: Props = $props();

	function handleLogout() {
		return async ({ result }: { result: { type: string; location?: string } }) => {
			await invalidateAll();
			goto(result.type === 'redirect' && result.location ? result.location : '/');
		};
	}

	const avatarUrl = $derived(user?.user_metadata?.avatar_url as string | undefined);
	const displayName = $derived(
		(user?.user_metadata?.full_name as string | undefined) ??
		(user?.user_metadata?.name as string | undefined) ??
		user?.email?.split('@')[0] ?? ''
	);
	const initials = $derived(
		displayName
			.split(' ')
			.map((w: string) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	const encodedPath = $derived(encodeURIComponent(currentPath));
</script>

<nav class="relative z-50 border-b border-base-300 bg-base-100/90 backdrop-blur">
	<!-- Mobile: solo avatar/login fisso in alto a destra -->
	<div class="fixed right-4 top-3 z-50 md:hidden">
		{#if user}
			<div class="dropdown dropdown-end">
				<div tabindex="0" role="button" class="avatar btn btn-circle btn-ghost btn-sm">
					{#if avatarUrl}
						<div class="w-8 rounded-full">
							<img src={avatarUrl} alt={displayName} referrerpolicy="no-referrer" />
						</div>
					{:else}
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content">
							{initials}
						</div>
					{/if}
				</div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<ul tabindex="0" class="menu dropdown-content z-50 mt-2 w-64 rounded-box bg-base-100 p-2 shadow-lg">
					<li class="pointer-events-none px-4 py-2">
						<p class="font-semibold">{displayName}</p>
						<p class="text-xs text-base-content/60">{user.email}</p>
						<p class="text-xs text-base-content/40 capitalize">{role ?? 'user'}</p>
					</li>
					<li class="divider my-1 h-px bg-base-300"></li>
					<li>
					<form method="POST" action="/login?/logout" use:enhance={handleLogout} class="p-0">
							<button class="btn btn-ghost btn-sm w-full justify-start text-error" type="submit">
								Logout
							</button>
						</form>
					</li>
				</ul>
			</div>
		{:else}
			<a class="btn btn-primary btn-sm" href={`/login?redirectTo=${encodedPath}`}>
				Login
			</a>
		{/if}
	</div>

	<!-- Desktop: navbar completa -->
	<div class="navbar mx-auto hidden max-w-6xl px-4 md:flex">
		<div class="navbar-start">
			<a class="btn btn-ghost text-lg font-semibold" href="/">Costs Tracker</a>
		</div>

		<div class="navbar-center">
			<ul class="menu menu-horizontal gap-2 px-1">
				{#if user}
					<li><a href="/">Home</a></li>
					<li><a href="/statistic">Statistic</a></li>
					<li><a href="/spaces">Spaces</a></li>
				{/if}
				{#if isAdmin}
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
			{#if user}
				<div class="dropdown dropdown-end">
					<div tabindex="0" role="button" class="avatar btn btn-circle btn-ghost">
						{#if avatarUrl}
							<div class="w-9 rounded-full">
								<img src={avatarUrl} alt={displayName} referrerpolicy="no-referrer" />
							</div>
						{:else}
							<div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
								{initials}
							</div>
						{/if}
					</div>
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<ul tabindex="0" class="menu dropdown-content z-50 mt-2 w-64 rounded-box bg-base-100 p-2 shadow-lg">
						<li class="pointer-events-none px-4 py-2">
							<p class="font-semibold">{displayName}</p>
							<p class="text-xs text-base-content/60">{user.email}</p>
							<p class="text-xs text-base-content/40 capitalize">{role ?? 'user'}</p>
						</li>
						<li class="divider my-1 h-px bg-base-300"></li>
						<li>
							<form method="POST" action="/login?/logout" use:enhance={handleLogout} class="p-0">
								<button class="btn btn-ghost btn-sm w-full justify-start text-error" type="submit">
									Logout
								</button>
							</form>
						</li>
					</ul>
				</div>
			{:else}
				<a class="btn btn-primary btn-sm min-h-11" href={`/login?redirectTo=${encodedPath}`}>
					Login
				</a>
			{/if}
		</div>
	</div>
</nav>
