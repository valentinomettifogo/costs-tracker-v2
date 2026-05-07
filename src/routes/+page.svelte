<script lang="ts">
	import type { MovementRow } from './+page.server';

	let { data, form } = $props();
	let showMovementForm = $state(false);
	let editingMovement = $state<MovementRow | null>(null);

	const typeBadgeClass: Record<string, string> = {
		needs: 'badge-warning',
		wants: 'badge-info',
		income: 'badge-success',
		savings: 'badge-primary'
	};

	const amountTextClass: Record<string, string> = {
		needs: 'text-warning',
		wants: 'text-info',
		income: 'text-success',
		savings: 'text-primary'
	};

	function formatAmount(amount: number, type: string | undefined | null): string {
		const isPositive = type === 'income' || type === 'savings';
		const locale = data.activeSpace?.format === 'EN' ? 'en-US' : 'it-IT';
		const formatted = new Intl.NumberFormat(locale, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
		return `${isPositive ? '+' : '−'}${formatted} ${data.activeSpace?.currency ?? ''}`;
	}

	function formatDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-');
		return `${d}/${m}/${y}`;
	}

	const todayISO = new Date().toISOString().slice(0, 10);
	const movementError = $derived((form as { movementError?: string } | undefined)?.movementError);
	const hasMore = $derived(data.totalMovements > data.limit);

	$effect(() => {
		if ((form as { movementSuccess?: boolean } | undefined)?.movementSuccess) {
			showMovementForm = false;
			editingMovement = null;
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
</script>

{#if !data.activeSpace}
	<section class="rounded-box bg-base-100 p-10 text-center shadow-sm">
		<p class="mb-4 text-base-content/60">Nessuno spazio attivo. Selezionane uno dalla lista.</p>
		<a href="/spaces" class="btn btn-primary btn-sm">Vai agli spazi</a>
	</section>
{:else}
	<div class="space-y-2">
		<div class="flex flex-wrap items-center gap-2">
			<h1 class="text-2xl font-bold">{data.activeSpace.name}</h1>
			<span class="badge badge-ghost badge-sm">{data.activeSpace.currency} · {data.activeSpace.format}</span>
		</div>

		<!-- Movimenti -->
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					Movimenti <span class="text-sm font-normal text-base-content/50">({data.totalMovements})</span>
				</h2>
			</div>

			{#if data.movements.length === 0}
				<p class="text-sm text-base-content/60">Nessun movimento ancora. Usa il pulsante + per aggiungerne uno.</p>
			{:else}
				<!-- Desktop: tabella -->
				<div class="hidden overflow-x-auto md:block">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th>Data</th>
								<th>Categoria</th>
								<th>Tipo</th>
								<th class="text-right">Importo</th>
								<th>Per</th>
								<th>Tags</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.movements as m (m.id)}
								{@const cat = m.costs_categories}
								<tr class="hover">
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
									<td class="text-right font-mono font-semibold {amountTextClass[cat?.type ?? ''] ?? ''}">
										{formatAmount(m.amount, cat?.type)}
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
											<button class="btn btn-ghost btn-xs" onclick={() => openEdit(m)} aria-label="Modifica">✏️</button>
											<form method="POST" action="?/deleteMovement">
												<input type="hidden" name="id" value={m.id} />
												<button class="btn btn-ghost btn-xs text-error" type="submit" aria-label="Elimina">🗑</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile: card list -->
				<ul class="space-y-3 md:hidden">
					{#each data.movements as m (m.id)}
						{@const cat = m.costs_categories}
						<li class="rounded-box border border-base-200 p-4">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-semibold">{cat?.name ?? '—'}</span>
										{#if cat?.type}<span class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}">{cat.type}</span>{/if}
									</div>
									<p class="mt-0.5 text-xs text-base-content/50">{formatDate(m.date)}{m.description ? ' · ' + m.description : ''}</p>
									{#if m.expense_user_id}
										<p class="mt-1 text-xs text-base-content/60">Per: {data.membersMap[m.expense_user_id] ?? m.expense_user_id.slice(0, 8)}</p>
									{/if}
									{#if m.tags?.length}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each m.tags as tag}<span class="badge badge-ghost badge-sm">{tag}</span>{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end gap-2">
									<span class="font-mono text-sm font-semibold {amountTextClass[cat?.type ?? ''] ?? ''}">
										{formatAmount(m.amount, cat?.type)}
									</span>
									<div class="flex gap-1">
										<button class="btn btn-ghost btn-xs" onclick={() => openEdit(m)} aria-label="Modifica">✏️</button>
										<form method="POST" action="?/deleteMovement">
											<input type="hidden" name="id" value={m.id} />
											<button class="btn btn-ghost btn-xs text-error" type="submit" aria-label="Elimina">🗑</button>
										</form>
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>

				{#if hasMore}
					<div class="mt-4 text-center">
						<a href="?limit={data.limit + data.pageStep}" class="btn btn-ghost btn-sm">
							Carica altri ({data.totalMovements - data.limit} rimanenti)
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
		aria-label="Aggiungi movimento"
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
				<h3 class="mb-4 text-lg font-bold">{editingMovement ? 'Modifica movimento' : 'Nuovo movimento'}</h3>

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
								<span class="label-text mb-1 block">Importo</span>
								<input
									class="input input-bordered w-full"
									type="number"
									name="amount"
									min="0.01"
									step="0.01"
									value={editingMovement?.amount ?? ''}
									required
								/>
							</label>
							<label class="form-control">
								<span class="label-text mb-1 block">Data</span>
								<input
									class="input input-bordered w-full"
									type="date"
									name="date"
									value={editingMovement?.date ?? todayISO}
									required
								/>
							</label>
						</div>

						<label class="form-control">
							<span class="label-text mb-1 block">Categoria</span>
							<select class="select select-bordered w-full" name="category_id">
								<option value="">— nessuna —</option>
								{#each data.categories as cat}
									<option value={cat.id} selected={editingMovement?.category_id === cat.id}
										>{cat.name} ({cat.type})</option
									>
								{/each}
							</select>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">Spesa per</span>
							<select class="select select-bordered w-full" name="expense_user_id">
								<option value="">— nessuno —</option>
								{#each Object.entries(data.membersMap) as [uid, email]}
									<option value={uid} selected={editingMovement?.expense_user_id === uid}
										>{email}</option
									>
								{/each}
							</select>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">Descrizione</span>
							<input
								class="input input-bordered w-full"
								type="text"
								name="description"
								value={editingMovement?.description ?? ''}
								placeholder="es. Supermercato, Bolletta…"
							/>
						</label>

						<label class="form-control">
							<span class="label-text mb-1 block">
								Tags <span class="text-xs text-base-content/50">(separati da virgola)</span>
							</span>
							<input
								class="input input-bordered w-full"
								type="text"
								name="tags"
								value={editingMovement?.tags?.join(', ') ?? ''}
								placeholder="es. casa, mensile"
							/>
						</label>

						<div class="modal-action">
							<button
								type="button"
								class="btn btn-ghost"
								onclick={() => { showMovementForm = false; editingMovement = null; }}
							>Annulla</button>
							<button type="submit" class="btn btn-primary">
								{editingMovement ? 'Salva' : 'Aggiungi'}
							</button>
						</div>
					</form>
				{/key}
			</div>
		</dialog>
	{/if}
{/if}