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

	let { data, form } = $props();
	let showMovementForm = $state(false);
	let editingMovement = $state<MovementRow | null>(null);
	let showCreateSuccessModal = $state(false);
	let showDeleteConfirmModal = $state(false);
	let pendingDeleteForm = $state<HTMLFormElement | null>(null);
	let pendingDeleteLabel = $state('');

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

	function loadMore() {
		goto(loadMoreHref, { noScroll: true, keepFocus: true });
	}

	function tagFilterHref(tag: string): string {
		const params = new URLSearchParams(data.filterQueryString);
		if (data.filters.tag === tag) {
			params.delete('tag');
		} else {
			params.set('tag', tag);
		}
		const qs = params.toString();
		return qs ? `?${qs}` : '/';
	}

	$effect(() => {
		if ((form as { movementSuccess?: boolean } | undefined)?.movementSuccess) {
			showMovementForm = false;
			editingMovement = null;
			if (movementAction === 'create') {
				showCreateSuccessModal = true;
			}
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

	function askDeleteConfirmation(m: MovementRow, event: MouseEvent) {
		const trigger = event.currentTarget as HTMLButtonElement | null;
		pendingDeleteForm = trigger?.form ?? null;
		pendingDeleteLabel = `${formatAmount(m.amount)} del ${formatDate(m.date)}`;
		showDeleteConfirmModal = true;
	}

	function cancelDeleteConfirmation() {
		showDeleteConfirmModal = false;
		pendingDeleteForm = null;
		pendingDeleteLabel = '';
	}

	function confirmDelete() {
		if (!pendingDeleteForm) return;
		const formEl = pendingDeleteForm;
		cancelDeleteConfirmation();
		formEl.requestSubmit();
	}

	function closeCreateSuccessModal() {
		showCreateSuccessModal = false;
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
		<div class="flex flex-wrap items-center gap-2 px-4 md:px-0">
			<h1 class="text-2xl font-bold">{data.activeSpace.name}</h1>
			<span class="badge badge-ghost badge-sm">{data.activeSpace.currency} · {data.activeSpace.format}</span>
			<a href={exportHref} download class="btn btn-ghost btn-xs gap-1" title="Export CSV">
				<Download size={14} />
				<span class="hidden sm:inline">Export CSV</span>
			</a>
		</div>

		<!-- Transactions -->
		<section class="rounded-box bg-base-100 p-2 shadow-sm">
			<TransactionFilters
				filters={data.filters}
				availableYears={data.availableYears}
				categories={data.categories}
				filterQueryString={data.filterQueryString}
			/>

			{#if data.movements.length === 0}
				<p class="text-sm text-base-content/60">No transactions found for the selected filters.</p>
			{:else}
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
									<td class="text-right font-semibold {amountClass(m.amount, m.costs_categories?.type)}">
										{formatAmount(m.amount)}
									</td>
									<td class="whitespace-nowrap text-sm">{formatDate(m.date)}</td>
									<td>
										<span class="font-medium">{cat?.name ?? '—'}</span>
										{#if m.description}<p class="text-xs text-base-content/50">{m.description}</p>{/if}
									</td>
									<td>
										{#if cat?.type}
											{#if cat?.type}
										<span
											class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}"
											style={typeBadgeStyle(cat.type)}
										>{cat.type}</span>
									{/if}
										{/if}
									</td>
									<td class="text-xs text-base-content/60">
										{m.expense_user_id ? (data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)) : ''}
									</td>
									<td>
										{#if m.tags?.length}
											<div class="flex flex-wrap gap-1">
												{#each m.tags as tag}
													<a href={tagFilterHref(tag)} class="badge badge-ghost badge-sm cursor-pointer hover:badge-primary">{tag}</a>
												{/each}
											</div>
										{/if}
									</td>
									<td>
										<div class="flex gap-1">
											<button class="btn btn-ghost btn-xs" onclick={() => openEdit(m)} aria-label="Edit">
												<Pencil size={14} />
											</button>
										<form method="POST" action={`?/deleteMovement${data.filterQueryString ? '&' + data.filterQueryString : ''}`}>
												<input type="hidden" name="id" value={m.id} />
												<button
													class="btn btn-ghost btn-xs text-error"
													type="button"
													onclick={(event) => askDeleteConfirmation(m, event)}
													aria-label="Delete"
												>
													<Trash2 size={14} />
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile: card list -->
				<ul class="space-y-2 md:hidden">
					{#each data.movements as m (m.id)}
						{@const cat = m.costs_categories}
						<li class="rounded-lg border border-base-200 px-3 py-2">
							<!-- Header: amount+category+type -->
							<div class="flex min-w-0 flex-wrap items-center gap-1.5">
								<span class="text-xl font-semibold {amountClass(m.amount, m.costs_categories?.type)}">{formatAmount(m.amount)}</span>
								<span class="text-base font-medium">{cat?.name ?? '—'}</span>
								{#if cat?.type}<span
							class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}"
							style={typeBadgeStyle(cat.type)}
						>{cat.type}</span>{/if}
							</div>
							<!-- Body: description -->
							{#if m.description}
								<p class="mt-1 text-sm text-base-content/60">{m.description}</p>
							{/if}
							{#if m.tags?.length}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each m.tags as tag}
										<a href={tagFilterHref(tag)} class="badge badge-ghost badge-sm cursor-pointer hover:badge-primary">{tag}</a>
									{/each}
								</div>
							{/if}
							<!-- Footer: date + user + actions -->
							<div class="mt-1 flex items-center justify-between gap-2">
								<div class="flex flex-wrap items-center gap-2 text-sm text-base-content/40">
									<span>{formatDate(m.date)}</span>
									{#if m.expense_user_id}
										<span>· {data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)}</span>
									{/if}
								</div>
								<div class="flex shrink-0 gap-1">
									<button class="btn btn-ghost btn-sm" onclick={() => openEdit(m)} aria-label="Edit">
										<Pencil size={16} />
									</button>
								<form method="POST" action={`?/deleteMovement${data.filterQueryString ? '&' + data.filterQueryString : ''}`} use:enhance use:enhance>
										<input type="hidden" name="id" value={m.id} />
										<button
											class="btn btn-ghost btn-sm text-error"
											type="button"
											onclick={(event) => askDeleteConfirmation(m, event)}
											aria-label="Delete"
										>
											<Trash2 size={16} />
										</button>
									</form>
								</div>
							</div>
						</li>
					{/each}
				</ul>

				{#if hasMore}
					<div class="mt-4 text-center">
						<button type="button" class="btn btn-ghost btn-sm" onclick={loadMore}>
							Load more ({data.totalMovements - data.limit} remaining)
						</button>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Bottone + flottante -->
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
		onCancel={cancelDeleteConfirmation}
	/>

	<SuccessModal
		open={showCreateSuccessModal}
		title="Transaction created"
		message="The new transaction was saved successfully."
		buttonLabel="Ok"
		onClose={closeCreateSuccessModal}
	/>
{/if}