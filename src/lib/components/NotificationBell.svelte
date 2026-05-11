<script lang="ts">
	import { Bell } from 'lucide-svelte';
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
	let isOpen = $state(false);

	// Merged view: deduplicate live items vs server data, apply local read state
	const items = $derived(
		[
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

	function toggle() {
		isOpen = !isOpen;
		if (isOpen) markAllRead();
	}

	function handleKeydown(e: KeyboardEvent) {
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
					liveItems = [payload.new as Notification, ...liveItems];
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(ch);
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative">
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
		<!-- Backdrop -->
		<button
			class="fixed inset-0 z-40 cursor-default"
			onclick={() => (isOpen = false)}
			aria-label="Close notifications"
			tabindex="-1"
		></button>

		<!-- Dropdown -->
		<div
			class="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
		>
			<div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
				<span class="text-sm font-semibold">Notifications</span>
				{#if unreadCount > 0}
					<span class="badge badge-primary badge-sm">{unreadCount} new</span>
				{/if}
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
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm">
										<span class="font-semibold">{notif.actor_name}</span>
										added
										<span
											class="font-medium {notif.amount < 0
												? 'text-error'
												: 'text-success'}"
										>
											{formatAmount(notif.amount)}
										</span>
										{#if notif.description}
											<span class="text-base-content/70">· {notif.description}</span>
										{/if}
									</p>
									<p class="mt-0.5 text-xs text-base-content/50">
										in <span class="font-medium">{notif.space_name}</span>
										· {relativeTime(notif.created_at)}
									</p>
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
