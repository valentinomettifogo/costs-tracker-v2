<script lang="ts">
	import type { MovementRow } from './+page.server';
	import { Pencil, Trash2, Download, PlusCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import SuccessModal from '$lib/components/SuccessModal.svelte';
	import TransactionFilters from '$lib/components/TransactionFilters.svelte';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import MovementFormModal from '$lib/components/MovementFormModal.svelte';
	import { buildTagFilterHref } from '$lib/utils';

	let { data, form } = $props();
	let showMovementForm = $state(false);
	let editingMovement = $state<MovementRow | null>(null);
	let showCreateSuccessModal = $state(false);
	let showDeleteConfirmModal = $state(false);
	let pendingDeleteId = $state<string | null>(null);
	let pendingDeleteLabel = $state('');
	let deleteFormEl = $state<HTMLFormElement | undefined>();

	const typeBadgeClass: Record<string, string> = {
		income: 'bg-green-100 text-green-700 border-green-200'
	};

	function typeBadgeStyle(type: string | null | undefined): string {
		const s = data.activeSpace;
		if (!s || !type || type === 'income') return '';
		const map: Record<string, string> = {
			needs: s.color_needs,
			wants: s.color_wants,
			savings: s.color_savings
		};
		const color = map[type];
		return color ? `background-color:${color}15; color:${color}; border-color:${color}30` : '';
	}

	function amountClass(amount: number, type?: string | null): string {
		if (type === 'savings') return 'text-yellow-600';
		return amount >= 0 ? 'text-green-600' : 'text-red-600';
	}

	function formatAmount(amount: number): string {
		const locale = data.activeSpace?.format === 'EN' ? 'en-US' : 'it-IT';
		const sign = amount >= 0 ? '+' : '−';
		const formatted = new Intl.NumberFormat(locale, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Math.abs(amount));
		return `${sign}${formatted}`;
	}

	function formatDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-');
		return `${d}/${m}/${y}`;
	}

	const movementError = $derived((form as { movementError?: string } | undefined)?.movementError);
	const movementAction = $derived((form as { movementAction?: string } | undefined)?.movementAction);
	const hasMore = $derived(data.totalMovements > data.limit);
	const loadMoreHref = $derived(
		`?${data.filterQueryString ? `${data.filterQueryString}&` : ''}limit=${data.limit + data.pageStep}`
	);
	const exportHref = $derived(
		`/export${data.filterQueryString ? `?${data.filterQueryString}` : ''}`
	);
	const deleteAction = $derived(
		`?/deleteMovement${data.filterQueryString ? '&' + data.filterQueryString : ''}`
	);

	$effect(() => {
		if ((form as { movementSuccess?: boolean } | undefined)?.movementSuccess) {
			showMovementForm = false;
			editingMovement = null;
			if (movementAction === 'create') showCreateSuccessModal = true;
		}
	});

	function openCreate() {
		editingMovement = null;
		showMovementForm = true;
	}

	function openEdit(m: MovementRow) {
		editingMovement = m;
		showMovementForm = true;
	}

	function askDeleteConfirmation(m: MovementRow) {
		pendingDeleteId = m.id;
		pendingDeleteLabel = `${formatAmount(m.amount)} of ${formatDate(m.date)}`;
		showDeleteConfirmModal = true;
	}

	function cancelDelete() {
		showDeleteConfirmModal = false;
		pendingDeleteId = null;
		pendingDeleteLabel = '';
	}

	function confirmDelete() {
		deleteFormEl?.requestSubmit();
		cancelDelete();
	}
</script>

<svelte:head>
	<title>Budget – Track shared expenses</title>
</svelte:head>

{#if !data.user}
	<LandingPage />
{:else if !data.activeSpace}
	<section class="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
		<p class="mb-6 text-gray-500 font-medium">No active space. Select one from the list.</p>
		<a href="/spaces" class="btn btn-primary">Go to spaces</a>
	</section>
{:else}
	<div class="space-y-4">
		<div class="flex items-center justify-between px-2 md:px-0">
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-bold text-gray-900">{data.activeSpace.name}</h1>
				<span class="badge badge-ghost">
					{data.activeSpace.currency} · {data.activeSpace.format}
				</span>
			</div>
			<a href={exportHref} download class="hidden md:inline-flex btn btn-ghost btn-xs gap-1.5" title="Export CSV">
				<Download size={14} />
				<span>Export CSV</span>
			</a>
		</div>

		<!-- Transactions -->
		<section class="rounded-2xl bg-white p-1 shadow-sm border border-gray-100 overflow-visible">
			<TransactionFilters
				filters={data.filters}
				availableYears={data.availableYears}
				categories={data.categories}
				filterQueryString={data.filterQueryString}
			/>



			{#if data.movements.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-gray-400 font-medium">No transactions found for the selected filters.</p>
				</div>
			{:else}
				<!-- Shared snippets ─────────────────────────────────────── -->
				{#snippet tagBadges(m: MovementRow)}
					{#if m.tags?.length}
						<div class="flex flex-wrap gap-1">
							{#each m.tags as tag}
								<a
									href={buildTagFilterHref(tag, data.filters.tag, data.filterQueryString)}
									class="badge badge-ghost cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
								>{tag}</a>
							{/each}
						</div>
					{/if}
				{/snippet}

				{#snippet typeBadge(type: string)}
					<span
						class="badge border {typeBadgeClass[type] ?? 'bg-gray-50 text-gray-500 border-gray-100'}"
						style={typeBadgeStyle(type)}
					>
						{type}
					</span>
				{/snippet}

				{#snippet rowActions(m: MovementRow, size: 'xs' | 'sm')}
					<button class="btn btn-ghost btn-{size} p-2!" onclick={() => openEdit(m)} aria-label="Edit">
						<Pencil size={size === 'xs' ? 14 : 16} />
					</button>
					<button
						class="btn btn-ghost btn-{size} p-2! text-red-500 hover:text-red-600 hover:bg-red-50"
						type="button"
						onclick={() => askDeleteConfirmation(m)}
						aria-label="Delete"
					>
						<Trash2 size={size === 'xs' ? 14 : 16} />
					</button>
				{/snippet}

				<!-- Desktop table ───────────────────────────────────────── -->
				<div class="hidden overflow-x-auto md:block px-2">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="border-b border-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
								<th class="px-4 py-3 text-right">Amount</th>
								<th class="px-4 py-3">Date</th>
								<th class="px-4 py-3">Category</th>
								<th class="px-4 py-3">Type</th>
								<th class="px-4 py-3">Paid By</th>
								<th class="px-4 py-3">Tags</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50">
							{#each data.movements as m (m.id)}
								{@const cat = m.costs_categories}
								<tr class="group transition-colors hover:bg-gray-50/50">
									<td class="px-4 py-3 text-right {amountClass(m.amount, cat?.type)}">
										{formatAmount(m.amount)}
									</td>
									<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
										{formatDate(m.date)}
									</td>
									<td class="px-4 py-3">
										<span class="text-sm font-semibold text-gray-700">{cat?.name ?? '—'}</span>
										{#if m.description}
											<p class="text-xs text-gray-400 leading-tight">{m.description}</p>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if cat?.type}{@render typeBadge(cat.type)}{/if}
									</td>
									<td class="px-4 py-3 text-xs font-medium text-gray-500">
										{m.expense_user_id ? (data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)) : ''}
									</td>
									<td class="px-4 py-3">{@render tagBadges(m)}</td>
									<td class="px-4 py-3">
										<div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											{@render rowActions(m, 'xs')}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile card list ────────────────────────────────────── -->
				<div class="md:hidden space-y-2 p-0">
					{#each data.movements as m (m.id)}
						{@const cat = m.costs_categories}
						<div class="rounded-xl border border-gray-50 bg-white p-3 shadow-sm space-y-2">
							<!-- Row 1: Header (Amount, Category, Type) -->
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-lg {amountClass(m.amount, cat?.type)} whitespace-nowrap">
										{formatAmount(m.amount)}
									</span>
									<span class="h-1 w-1 rounded-full bg-gray-300 shrink-0"></span>
									<span class="font-bold text-gray-800">{cat?.name ?? '—'}</span>
								</div>
								{#if cat?.type}
									<div class="shrink-0">
										{@render typeBadge(cat.type)}
									</div>
								{/if}
							</div>

							<!-- Row 2: Description -->
							{#if m.description}
								<p class="text-sm text-gray-500 leading-tight">{m.description}</p>
							{/if}
							
							<!-- Row 3: Tags -->
							{#if m.tags?.length}
								<div class="flex flex-wrap items-center gap-1.5">
									{@render tagBadges(m)}
								</div>
							{/if}

							<!-- Row 4: Footer (Date, User, Actions) -->
							<div class="mt-1 flex items-center justify-between gap-1 pt-2">
								<div class="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-0">
									<span class="whitespace-nowrap">{formatDate(m.date)}</span>
									{#if m.expense_user_id}
										<span class="h-1 w-1 rounded-full bg-gray-200 shrink-0"></span>
										<span class="wrap-break-words">{data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)}</span>
									{/if}
								</div>
								<div class="flex items-center gap-1 shrink-0">
									{@render rowActions(m, 'sm')}
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if hasMore}
					<div class="mt-6 p-4 text-center">
						<button
							type="button"
							class="btn btn-outline btn-sm w-full md:w-auto"
							onclick={() => goto(loadMoreHref, { noScroll: true, keepFocus: true })}
						>
							Load more ({data.totalMovements - data.limit} remaining)
						</button>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Shared delete form -->
	<form bind:this={deleteFormEl} method="POST" action={deleteAction} use:enhance hidden>
		<input type="hidden" name="id" value={pendingDeleteId ?? ''} />
	</form>

	<!-- FAB -->
	<button
		class="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-110 active:scale-95 md:bottom-8 md:right-8"
		type="button"
		onclick={openCreate}
		aria-label="Add transaction"
	>
		<PlusCircle size={28} />
	</button>

	{#if showMovementForm}
		<MovementFormModal
			editing={editingMovement}
			categories={data.categories}
			membersMap={data.membersMap}
			userId={data.userId ?? ''}
			onClose={() => { showMovementForm = false; editingMovement = null; }}
		/>
	{/if}

	{#if showDeleteConfirmModal}
		<ConfirmModal
			title="Confirm deletion"
			message={`Do you really want to delete transaction ${pendingDeleteLabel}?`}
			confirmLabel="Yes, delete"
			cancelLabel="Cancel"
			onConfirm={confirmDelete}
			onCancel={cancelDelete}
		/>
	{/if}

	{#if showCreateSuccessModal}
		<SuccessModal
			title="Transaction created"
			message="The new transaction was saved successfully."
			buttonLabel="Ok"
			onClose={() => (showCreateSuccessModal = false)}
		/>
	{/if}
{/if}
