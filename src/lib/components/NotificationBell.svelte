<script lang="ts">
	import { Bell, Trash2, CheckCheck } from 'lucide-svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Notification } from '$lib/types';

	interface Props {
		notifications: Notification[];
		userId: string;
	}

	let { notifications: serverNotifications, userId }: Props = $props();

	// Real-time additions not yet reflected in server-loaded data
	let liveItems = $state<Notification[]>([]);
	// Optimistic read tracking (IDs marked as read locally before server confirms)
	let locallyReadIds = $state(new Set<string>());
	// Set to true optimistically after deleteAll
	let allDeleted = $state(false);
	let isOpen = $state(false);

	// Merged view: deduplicate live items vs server data, apply local read state
	const items = $derived(
		allDeleted
			? []
			: [
					...liveItems.filter((n) => !serverNotifications.some((s) => s.id === n.id)),
					...serverNotifications
				].map((n) => ({ ...n, read: n.read || locallyReadIds.has(n.id) }))
	);

	const unreadCount = $derived(items.filter((n) => !n.read).length);
	const badgeLabel = $derived(unreadCount > 9 ? '9+' : String(unreadCount));

	function formatAmount(amount: number): string {
		const abs = Math.abs(amount);
		const sign = amount < 0 ? '-' : '+';
		return `${sign}€${abs.toFixed(2)}`;
	}

	function relativeTime(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	async function markAllRead() {
		if (unreadCount === 0) return;
		items.forEach((n) => locallyReadIds.add(n.id));
		locallyReadIds = new Set(locallyReadIds);
		await fetch('/notifications', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ all: true })
		});
	}

	async function deleteAll() {
		if (items.length === 0) return;
		allDeleted = true;
		liveItems = [];
		await fetch('/notifications', { method: 'DELETE' });
	}

	// DOM reference used for the click-outside check
	let containerEl = $state<HTMLDivElement | undefined>();

	function toggle() {
		isOpen = !isOpen;
		if (isOpen) markAllRead();
	}

	function handleWindowClick(e: MouseEvent) {
		if (isOpen && containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') isOpen = false;
	}

	$effect(() => {
		if (!userId) return;

		const ch = supabase
			.channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'costs_notifications',
					filter: `user_id=eq.${userId}`
				},
				(payload) => {
					allDeleted = false;
					liveItems = [payload.new as Notification, ...liveItems];
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(ch);
		};
	});
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="relative" bind:this={containerEl}>
	<button
		class="btn btn-circle btn-ghost relative"
		onclick={toggle}
		aria-label="Notifications"
		aria-expanded={isOpen}
	>
		<Bell size={20} />
		{#if unreadCount > 0}
			<span
				class="badge badge-primary badge-xs absolute right-1 top-1 min-w-[1.1rem] px-0.5 text-[10px]"
			>
				{badgeLabel}
			</span>
		{/if}
	</button>

	{#if isOpen}
		<!-- Dropdown: z-51 ensures it sits above the navbar's z-50 -->
		<div
			class="absolute right-0 z-51 mt-2 w-80 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
		>
			<div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
				<span class="text-sm font-semibold">Notifications</span>
				<div class="flex items-center gap-1">
					{#if unreadCount > 0}
						<button
							class="btn btn-ghost btn-xs gap-1"
							onclick={markAllRead}
							title="Mark all as read"
						>
							<CheckCheck size={14} />
						</button>
					{/if}
					{#if items.length > 0}
						<button
							class="btn btn-ghost btn-xs text-error"
							onclick={deleteAll}
							title="Delete all notifications"
						>
							<Trash2 size={14} />
						</button>
					{/if}
				</div>
			</div>

			<ul class="max-h-96 overflow-y-auto">
				{#if items.length === 0}
					<li class="px-4 py-8 text-center text-sm text-base-content/50">
						No notifications yet
					</li>
				{:else}
					{#each items as notif (notif.id)}
						<li
							class="border-b border-base-200 px-4 py-3 transition-colors last:border-0 {!notif.read
								? 'bg-primary/5'
								: ''}"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									<p class="text-sm">
										<span class="font-semibold">{notif.actor_name}</span>
										added
										<span
											class="font-medium {notif.amount < 0
												? 'text-error'
												: 'text-success'}"
										>
											{formatAmount(notif.amount)}
										</span>
									</p>
									{#if notif.category_name}
										<p class="mt-0.5 text-xs text-base-content/60">
											in <span class="font-medium">{notif.category_name}</span>
										</p>
									{/if}
									<p class="mt-0.5 text-xs text-base-content/60">
										in <span class="font-medium">{notif.space_name}</span>
									</p>
									<p class="mt-0.5 text-xs text-base-content/40">{relativeTime(notif.created_at)}</p>
								</div>
								{#if !notif.read}
									<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"></span>
								{/if}
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	{/if}
</div>
