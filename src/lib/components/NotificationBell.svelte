<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import type { Notification } from '$lib/types';
	import { Bell } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface Props {
		notifications: Notification[];
		userId: string;
	}

	let { notifications, userId }: Props = $props();

	let liveItems = $state<Notification[]>([]);
	let locallyReadIds = $state<string[]>([]);
	let allDeleted = $state(false);
	let isOpen = $state(false);
	let readTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!isOpen) return;
		const unreadIds = mergedNotifications.filter((n) => !n.read).map((n) => n.id);
		if (unreadIds.length === 0) return;
		readTimer = setTimeout(() => {
			locallyReadIds = [...new Set([...locallyReadIds, ...unreadIds])];
			fetch('/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ all: true })
			});
		}, 2000);
		return () => {
			if (readTimer) clearTimeout(readTimer);
		};
	});

	const mergedNotifications = $derived(
		allDeleted
			? []
			: [
					...liveItems,
					...notifications.filter((n) => !liveItems.some((li) => li.id === n.id))
				]
					.map((n) => ({
						...n,
						read: n.read || locallyReadIds.includes(n.id)
					}))
					.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
	);

	const unreadCount = $derived(mergedNotifications.filter((n) => !n.read).length);
	const badgeLabel = $derived(unreadCount > 9 ? '9+' : String(unreadCount));

	onMount(() => {
		const channel = supabase
			.channel('notifications-live')
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
			supabase.removeChannel(channel);
		};
	});

	async function clearAll() {
		allDeleted = true;
		isOpen = false;
		await fetch('/notifications', { method: 'DELETE' });
	}

	function handleClickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target) return;

			// Ignore if the clicked element was removed from the DOM (e.g. by a Svelte update)
			if (!document.body.contains(target)) return;

			if (node && !node.contains(target) && !event.defaultPrevented) {
				isOpen = false;
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	function formatNotifDate(isoStr: string): string {
		const d = new Date(isoStr);
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = d.getFullYear();
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${day}/${month}/${year} · ${hours}:${minutes}`;
	}

	function getNotificationContent(n: Notification) {
		const amount = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n.amount);
		const title = n.amount > 0 ? 'New income' : 'New expense';
		const message = `${n.actor_name} added ${amount} in ${n.category_name ?? 'uncategorized'} (${n.space_name})`;
		return { title, message };
	}
</script>

<div class="relative inline-block" use:handleClickOutside>
	<button
		type="button"
		class="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
		onclick={() => (isOpen = !isOpen)}
		aria-label="Notifications"
	>
		<Bell size={20} class="pointer-events-none" />
		{#if unreadCount > 0}
			<span class="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white pointer-events-none">
				{badgeLabel}
			</span>
		{/if}
	</button>

	{#if isOpen}
		<div class="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-100 z-[60]">
			<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
				<h3 class="text-sm font-bold text-gray-900">Notifications</h3>
				{#if mergedNotifications.length > 0}
					<button
						type="button"
						class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
						onclick={clearAll}
					>
						Clear all
					</button>
				{/if}
			</div>

			<div class="max-h-96 overflow-y-auto">
				{#if mergedNotifications.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
							<Bell size={24} />
						</div>
						<p class="mt-2 text-sm text-gray-400 font-medium">No notifications yet</p>
					</div>
				{:else}
					<ul class="divide-y divide-gray-50">
						{#each mergedNotifications as n (n.id)}
							{@const content = getNotificationContent(n)}
							<li class="relative flex flex-col p-4 transition-colors hover:bg-gray-50 {n.read ? 'opacity-60' : ''}">
								<p class="text-sm font-medium text-gray-900">{content.title}</p>
								<p class="mt-0.5 text-xs text-gray-500 leading-relaxed">{content.message}</p>
								{#if n.description}
									<p class="mt-1 text-[11px] italic text-gray-400">"{n.description}"</p>
								{/if}
								<p class="mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
									{formatNotifDate(n.created_at)}
								</p>
								{#if !n.read}
									<span class="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-primary"></span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</div>
