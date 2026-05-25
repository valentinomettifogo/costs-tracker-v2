<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import type { Notification } from '$lib/types';
	import { LogOut, LayoutGrid, BarChart3, Users } from 'lucide-svelte';

	interface Props {
		user: { id?: string; email?: string; user_metadata?: Record<string, unknown> } | null;
		role: string | null;
		currentPath: string;
		notifications: Notification[];
	}

	let { user, role, currentPath, notifications }: Props = $props();

	const userId = $derived(user?.id ?? '');

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
	const currentPathClean = $derived(currentPath.split('?')[0]);

	let isUserMenuOpen = $state(false);

	function handleClickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target) return;

			// Ignore if the clicked element was removed from the DOM (e.g. by a Svelte update)
			if (!document.body.contains(target)) return;

			if (node && !node.contains(target) && !event.defaultPrevented) {
				isUserMenuOpen = false;
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}
</script>

<nav class="pt-safe sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
	<div class="mx-auto max-w-6xl px-4">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="/" class="flex shrink-0 items-center">
					<img src="/images/logo-navbar.png" alt="Costs Tracker" class="h-10 w-auto" />
				</a>

				<!-- Desktop Menu -->
				<div class="hidden md:ml-8 md:flex md:space-x-1">
					{#if user}
						<a
							href="/"
							class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {currentPathClean === '/' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							Home
						</a>
						<a
							href="/statistics"
							class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {currentPathClean === '/statistics' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							Statistics
						</a>
					{/if}
				</div>
			</div>

			<!-- Right Side -->
			<div class="flex items-center gap-2">
				{#if user}
					<NotificationBell {notifications} {userId} />
					
					<!-- User Dropdown -->
					<div class="relative" use:handleClickOutside>
						<button
							type="button"
							onclick={() => (isUserMenuOpen = !isUserMenuOpen)}
							class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 transition-all hover:ring-2 hover:ring-primary/20 focus:outline-none"
						>
							{#if avatarUrl}
								<img src={avatarUrl} alt={displayName} class="h-full w-full object-cover pointer-events-none" referrerpolicy="no-referrer" />
							{:else}
								<span class="text-sm font-semibold text-primary pointer-events-none">{initials}</span>
							{/if}
						</button>

						{#if isUserMenuOpen}
							<div class="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
								<div class="px-4 py-3">
									<p class="text-sm font-semibold text-gray-900">{displayName}</p>
									<p class="truncate text-xs text-gray-500">{user.email}</p>
									<div class="mt-1 flex items-center gap-1">
										<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 capitalize">
											{role ?? 'user'}
										</span>
									</div>
								</div>
								
								<div class="my-1 border-t border-gray-100"></div>
								
								<a
									href="/spaces"
									class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
									onclick={() => (isUserMenuOpen = false)}
								>
									<Users size={16} class="text-gray-400" />
									Spaces
								</a>

								<div class="my-1 border-t border-gray-100"></div>
								
								<form method="POST" action="/login?/logout" use:enhance={handleLogout}>
									<button
										type="submit"
										class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
									>
										<LogOut size={16} />
										Logout
									</button>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<a class="btn btn-primary btn-sm" href={`/login?redirectTo=${encodedPath}`}>
						Login
					</a>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Mobile: bottom navigation bar -->
<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white md:hidden">
	{#if user}
		<ul class="pb-safe flex h-[calc(4rem+env(safe-area-inset-bottom,0))] items-stretch justify-around px-2">
			<li class="flex-1">
				<a
					class={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${currentPathClean === '/' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
					href="/"
				>
					<LayoutGrid size={20} />
					<span class="text-[10px] font-medium">Home</span>
				</a>
			</li>
			<li class="flex-1">
				<a
					class={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${currentPathClean === '/statistics' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
					href="/statistics"
				>
					<BarChart3 size={20} />
					<span class="text-[10px] font-medium">Stats</span>
				</a>
			</li>
		</ul>
	{/if}
</nav>
