<script lang="ts">
	import type { MovementRow } from './+page.server';
	import { Pencil, Trash2 } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import SuccessModal from '$lib/components/SuccessModal.svelte';

	let { data, form } = $props();
	let showMovementForm = $state(false);
	let editingMovement = $state<MovementRow | null>(null);
	let showCreateSuccessModal = $state(false);
	let showDeleteConfirmModal = $state(false);
	let pendingDeleteForm = $state<HTMLFormElement | null>(null);
	let pendingDeleteLabel = $state('');

	const typeBadgeClass: Record<string, string> = {
		needs: 'badge-warning',
		wants: 'badge-info',
		income: 'badge-success',
		savings: 'badge-primary'
	};

	function amountClass(amount: number): string {
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

	const todayISO = new Date().toISOString().slice(0, 10);
	const movementError = $derived((form as { movementError?: string } | undefined)?.movementError);
	const movementAction = $derived((form as { movementAction?: string } | undefined)?.movementAction);
	const hasMore = $derived(data.totalMovements > data.limit);

	const groupedCategories = $derived(
		Object.entries(
			data.categories.reduce(
				(acc: Record<string, typeof data.categories>, cat) => {
					if (!acc[cat.type]) acc[cat.type] = [];
					acc[cat.type].push(cat);
					return acc;
				},
				{}
			)
		).map(([type, cats]) => ({ type, cats }))
	);

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

	// For edit: determine if current stored amount is inverted relative to expected sign
	function editInvertSign(m: MovementRow): boolean {
		const catType = m.costs_categories?.type;
		const expectedPositive = catType === 'income';
		const actualPositive = m.amount >= 0;
		return expectedPositive !== actualPositive;
	}

	function closeCreateSuccessModal() {
		showCreateSuccessModal = false;
	}
</script>

{#if !data.activeSpace}
	<section class="rounded-box bg-base-100 p-10 text-center shadow-sm">
		<p class="mb-4 text-base-content/60">No active space. Select one from the list.</p>
		<a href="/spaces" class="btn btn-primary btn-sm">Go to spaces</a>
	</section>
{:else}
	<div class="-mx-3 space-y-2 md:mx-0">
		<div class="flex flex-wrap items-center gap-2 px-4 md:px-0">
			<h1 class="text-2xl font-bold">{data.activeSpace.name}</h1>
			<span class="badge badge-ghost badge-sm">{data.activeSpace.currency} · {data.activeSpace.format}</span>
		</div>

		<!-- Transactions -->
		<section class="rounded-box bg-base-100 p-2 shadow-sm">
			{#if data.movements.length === 0}
				<p class="text-sm text-base-content/60">No transactions yet. Use the + button to add one.</p>
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
									<td class="text-right font-semibold {amountClass(m.amount)}">
										{formatAmount(m.amount)}
									</td>
									<td class="whitespace-nowrap text-sm">{formatDate(m.date)}</td>
									<td>
										<span class="font-medium">{cat?.name ?? '—'}</span>
										{#if m.description}<p class="text-xs text-base-content/50">{m.description}</p>{/if}
									</td>
									<td>
										{#if cat?.type}
											<span class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}">{cat.type}</span>
										{/if}
									</td>
									<td class="text-xs text-base-content/60">
										{m.expense_user_id ? (data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)) : ''}
									</td>
									<td>
										{#if m.tags?.length}
											<div class="flex flex-wrap gap-1">
												{#each m.tags as tag}
													<span class="badge badge-ghost badge-sm">{tag}</span>
												{/each}
											</div>
										{/if}
									</td>
									<td>
										<div class="flex gap-1">
											<button class="btn btn-ghost btn-xs" onclick={() => openEdit(m)} aria-label="Edit">
												<Pencil size={14} />
											</button>
											<form method="POST" action="?/deleteMovement">
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
								<span class="text-xl font-semibold {amountClass(m.amount)}">{formatAmount(m.amount)}</span>
								<span class="text-base font-medium">{cat?.name ?? '—'}</span>
								{#if cat?.type}<span class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}">{cat.type}</span>{/if}
							</div>
							<!-- Body: description -->
							{#if m.description}
								<p class="mt-1 text-sm text-base-content/60">{m.description}</p>
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
									<form method="POST" action="?/deleteMovement">
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
						<a href="?limit={data.limit + data.pageStep}" class="btn btn-ghost btn-sm">
							Load more ({data.totalMovements - data.limit} remaining)
						</a>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Bottone + flottante -->
	<button
		class="btn btn-primary btn-circle fixed bottom-20 right-4 z-30 h-14 w-14 text-2xl shadow-lg md:bottom-8 md:right-8"
		type="button"
		onclick={openCreate}
		aria-label="Add transaction"
	>+</button>

	<!-- Modale inserimento/modifica movimento -->
	{#if showMovementForm}
		<dialog class="modal modal-open modal-bottom sm:modal-middle">
			<div
				class="modal-backdrop"
				role="button"
				tabindex="-1"
				onclick={() => { showMovementForm = false; editingMovement = null; }}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { showMovementForm = false; editingMovement = null; } }}
			></div>
			<div class="modal-box">
				<h3 class="mb-4 text-lg font-bold">{editingMovement ? 'Edit transaction' : 'New transaction'}</h3>

				{#if movementError}
					<div class="alert alert-error mb-4 text-sm">{movementError}</div>
				{/if}

				{#key editingMovement?.id ?? 'new'}
						<form
						method="POST"
						action={editingMovement ? '?/updateMovement' : '?/createMovement'}
						class="space-y-4"
					>
						{#if editingMovement}
							<input type="hidden" name="id" value={editingMovement.id} />
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<label class="form-control">
								<span class="label-text mb-1 block">Amount</span>
								<input
									class="input input-bordered w-full"
									type="number"
									name="amount"
									min="0.01"
									step="0.01"
									value={editingMovement ? Math.abs(editingMovement.amount) : ''}
									required
								/>
							</label>
							<label class="form-control">
								<span class="label-text mb-1 block">Date</span>
								<input
									class="input input-bordered w-full"
									type="date"
									name="date"
									value={editingMovement?.date ?? todayISO}
									required
								/>
							</label>
						</div>

						<label class="form-control flex-row items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								name="invert_sign"
								class="checkbox checkbox-sm"
								checked={editingMovement ? editInvertSign(editingMovement) : false}
							/>
							<span class="label-text">Invert sign <span class="text-xs text-base-content/50">(e.g. cashback on a cost)</span></span>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">Category</span>
							<select class="select select-bordered w-full" name="category_id">
								<option value="">— none —</option>
								{#each groupedCategories as group}
									<optgroup label={group.type.charAt(0).toUpperCase() + group.type.slice(1)}>
										{#each group.cats as cat}
											<option value={cat.id} selected={editingMovement?.category_id === cat.id}>{cat.name}</option>
										{/each}
									</optgroup>
								{/each}
							</select>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">Paid By</span>
							<select class="select select-bordered w-full" name="expense_user_id">
								<option value="">— none —</option>
								{#each Object.entries(data.membersMap) as [uid, name]}
									<option
										value={uid}
										selected={editingMovement
											? editingMovement.expense_user_id === uid
											: uid === data.userId}
									>{name}</option>
								{/each}
							</select>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">Description</span>
							<input
								class="input input-bordered w-full"
								type="text"
								name="description"
								value={editingMovement?.description ?? ''}
								placeholder="e.g. Supermarket, Bill…"
							/>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">
								Tags <span class="text-xs text-base-content/50">(comma separated)</span>
							</span>
							<input
								class="input input-bordered w-full"
								type="text"
								name="tags"
								value={editingMovement?.tags?.join(', ') ?? ''}
								placeholder="e.g. home, monthly"
							/>
						</label>

						{#if !editingMovement}
							<label class="form-control flex-row items-center gap-3 cursor-pointer">
								<input type="checkbox" name="recurring" class="checkbox checkbox-sm" />
								<span class="label-text">
									Recurring
									<span class="text-xs text-base-content/50">(create monthly until end of year)</span>
								</span>
							</label>
						{/if}

						<div class="modal-action">
							<button
								type="button"
								class="btn btn-ghost"
								onclick={() => { showMovementForm = false; editingMovement = null; }}
							>Cancel</button>
								<button type="submit" class="btn btn-primary">
									{editingMovement ? 'Save' : 'Add'}
							</button>
						</div>
					</form>
				{/key}
			</div>
		</dialog>
	{/if}

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