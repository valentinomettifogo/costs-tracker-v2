<script lang="ts">
	import type { MovementRow } from './+page.server';
	import { Pencil, Trash2, Download } from 'lucide-svelte';
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
		income: 'badge-success'
	};

	function typeBadgeStyle(type: string | null | undefined): string {
		const s = data.activeSpace;
		if (!s || !type) return '';
		const map: Record<string, string> = {
			needs: s.color_needs,
			wants: s.color_wants,
			savings: s.color_savings
		};
		const color = map[type];
		return color ? `background-color:${color};color:#fff;border-color:${color}` : '';
	}

	function amountClass(amount: number, type?: string | null): string {
		if (type === 'savings') return 'text-yellow-400';
		return amount >= 0 ? 'text-success' : 'text-error';
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
	<section class="rounded-box bg-base-100 p-10 text-center shadow-sm">
		<p class="mb-4 text-base-content/60">No active space. Select one from the list.</p>
		<a href="/spaces" class="btn btn-primary btn-sm">Go to spaces</a>
	</section>
{:else}
	<div class="-mx-3 space-y-2 md:mx-0">
		<div class="flex flex-wrap items-center gap-2 px-4 pr-20 md:px-0 md:pr-0">
			<h1 class="text-2xl font-bold">{data.activeSpace.name}</h1>
			<span class="badge badge-ghost badge-sm">{data.activeSpace.currency} · {data.activeSpace.format}</span>
		</div>

		<!-- Transactions -->
		<section class="rounded-box bg-base-100 p-2 shadow-sm">
			<TransactionFilters
				filters={data.filters}
				availableYears={data.availableYears}
				categories={data.categories}
				filterQueryString={data.filterQueryString}
			/>
			<div class="flex justify-end px-2 pb-1">
				<a href={exportHref} download class="btn btn-ghost btn-xs gap-1" title="Export CSV">
					<Download size={14} />
					<span>Export CSV</span>
				</a>
			</div>

			{#if data.movements.length === 0}
				<p class="text-sm text-base-content/60">No transactions found for the selected filters.</p>
			{:else}
				<!-- Shared snippets ─────────────────────────────────────── -->
				{#snippet tagBadges(m: MovementRow)}
					{#if m.tags?.length}
						<div class="flex flex-wrap gap-1">
							{#each m.tags as tag}
								<a
									href={buildTagFilterHref(tag, data.filters.tag, data.filterQueryString)}
									class="badge badge-ghost badge-sm cursor-pointer hover:badge-primary"
								>{tag}</a>
							{/each}
						</div>
					{/if}
				{/snippet}

				{#snippet typeBadge(type: string)}
					<span
						class="badge badge-sm {typeBadgeClass[type] ?? 'badge-ghost'}"
						style={typeBadgeStyle(type)}
					>{type}</span>
				{/snippet}

				{#snippet rowActions(m: MovementRow, size: 'xs' | 'sm')}
					<button class="btn btn-ghost btn-{size}" onclick={() => openEdit(m)} aria-label="Edit">
						<Pencil size={size === 'xs' ? 14 : 16} />
					</button>
					<button
						class="btn btn-ghost btn-{size} text-error"
						type="button"
						onclick={() => askDeleteConfirmation(m)}
						aria-label="Delete"
					>
						<Trash2 size={size === 'xs' ? 14 : 16} />
					</button>
				{/snippet}

				<!-- Desktop table ───────────────────────────────────────── -->
				<div class="hidden overflow-x-auto md:block">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th class="text-right">Amount</th>
								<th>Date</th>
								<th>Category</th>
								<th>Type</th>
								<th>By</th>
								<th>Tags</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.movements as m (m.id)}
								{@const cat = m.costs_categories}
								<tr class="hover">
									<td class="text-right font-semibold {amountClass(m.amount, cat?.type)}">
										{formatAmount(m.amount)}
									</td>
									<td class="whitespace-nowrap text-sm">{formatDate(m.date)}</td>
									<td>
										<span class="font-medium">{cat?.name ?? '—'}</span>
										{#if m.description}<p class="text-xs text-base-content/50">{m.description}</p>{/if}
									</td>
									<td>{#if cat?.type}{@render typeBadge(cat.type)}{/if}</td>
									<td class="text-xs text-base-content/60">
										{m.expense_user_id ? (data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)) : ''}
									</td>
									<td>{@render tagBadges(m)}</td>
									<td>
										<div class="flex gap-1">
											{@render rowActions(m, 'xs')}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile card list ────────────────────────────────────── -->
				<ul class="space-y-2 md:hidden">
					{#each data.movements as m (m.id)}
						{@const cat = m.costs_categories}
						<li class="rounded-lg border border-base-200 px-3 py-2">
							<div class="flex min-w-0 flex-wrap items-center gap-1.5">
								<span class="text-xl font-semibold {amountClass(m.amount, cat?.type)}">{formatAmount(m.amount)}</span>
								<span class="text-base font-medium">{cat?.name ?? '—'}</span>
								{#if cat?.type}{@render typeBadge(cat.type)}{/if}
							</div>
							{#if m.description}
								<p class="mt-1 text-sm text-base-content/60">{m.description}</p>
							{/if}
							<div class="mt-2">{@render tagBadges(m)}</div>
							<div class="mt-1 flex items-center justify-between gap-2">
								<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/40">
									<span>{formatDate(m.date)}</span>
									{#if m.expense_user_id}
										<span>· {data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)}</span>
									{/if}
								</div>
								<div class="flex shrink-0 gap-1">
									{@render rowActions(m, 'sm')}
								</div>
							</div>
						</li>
					{/each}
				</ul>

				{#if hasMore}
					<div class="mt-4 text-center">
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => goto(loadMoreHref, { noScroll: true, keepFocus: true })}>
							Load more ({data.totalMovements - data.limit} remaining)
						</button>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Shared delete form – submitted programmatically from confirmDelete() -->
	<form bind:this={deleteFormEl} method="POST" action={deleteAction} use:enhance hidden>
		<input type="hidden" name="id" value={pendingDeleteId ?? ''} />
	</form>

	<!-- FAB -->
	<button
		class="btn btn-primary btn-circle fixed bottom-20 right-4 z-30 h-16 w-16 leading-none shadow-lg md:bottom-8 md:right-8"
		style="font-size: 2.25rem;"
		type="button"
		onclick={openCreate}
		aria-label="Add transaction"
	>+</button>

	<MovementFormModal
		open={showMovementForm}
		editing={editingMovement}
		{movementError}
		filterQueryString={data.filterQueryString}
		categories={data.categories}
		membersMap={data.membersMap}
		userId={data.userId ?? ''}
		onClose={() => { showMovementForm = false; editingMovement = null; }}
	/>

	<ConfirmModal
		open={showDeleteConfirmModal}
		title="Confirm deletion"
		message={`Do you really want to delete transaction ${pendingDeleteLabel}?`}
		confirmLabel="Yes, delete"
		cancelLabel="Cancel"
		onConfirm={confirmDelete}
		onCancel={cancelDelete}
	/>

	<SuccessModal
		open={showCreateSuccessModal}
		title="Transaction created"
		message="The new transaction was saved successfully."
		buttonLabel="Ok"
		onClose={() => (showCreateSuccessModal = false)}
	/>
{/if}