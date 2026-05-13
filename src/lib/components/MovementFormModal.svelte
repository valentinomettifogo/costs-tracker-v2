<script lang="ts">
	import { enhance } from '$app/forms';

	interface MovementRow {
		id: string;
		amount: number;
		date: string;
		description: string | null;
		user_id: string;
		expense_user_id: string | null;
		tags: string[] | null;
		category_id: string | null;
		costs_categories: { id: string; name: string; type: string } | null;
	}

	interface Category {
		id: string;
		name: string;
		type: string;
		space_id: string;
	}

	interface Props {
		open: boolean;
		editing: MovementRow | null;
		movementError: string | undefined;
		filterQueryString: string;
		categories: Category[];
		membersMap: Record<string, string>;
		userId: string;
		onClose: () => void;
	}

	let { open, editing, movementError, filterQueryString, categories, membersMap, userId, onClose }: Props = $props();

	let submitting = $state(false);
	let selectedCategoryId = $state('');

	$effect(() => {
		selectedCategoryId = editing?.category_id ?? '';
	});

	const todayISO = new Date().toISOString().slice(0, 10);

	const groupedCategories = $derived(
		Object.entries(
			categories.reduce(
				(acc: Record<string, Category[]>, cat) => {
					if (!acc[cat.type]) acc[cat.type] = [];
					acc[cat.type].push(cat);
					return acc;
				},
				{}
			)
		).map(([type, cats]) => ({ type, cats }))
	);

	let selectedCategoryType = $derived(
		categories.find((c) => c.id === selectedCategoryId)?.type ?? editing?.costs_categories?.type ?? null
	);

	let invertSign = $derived.by(() => {
		if (!editing) return false;
		const expectedPositive = selectedCategoryType === 'income';
		const actualPositive = editing.amount >= 0;
		return expectedPositive !== actualPositive;
	});

	function closeModal() {
		if (!submitting) onClose();
	}
</script>

{#if open}
	<dialog
		class="modal modal-open modal-bottom sm:modal-middle"
		onclick={(e) => { if (e.target === e.currentTarget && !submitting) closeModal(); }}
	>
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">{editing ? 'Edit transaction' : 'New transaction'}</h3>

			{#if movementError}
				<div class="alert alert-error mb-4 text-sm">{movementError}</div>
			{/if}

			{#key editing?.id ?? 'new'}
				<form
					method="POST"
					action={editing
						? `?/updateMovement${filterQueryString ? '&' + filterQueryString : ''}`
						: `?/createMovement${filterQueryString ? '&' + filterQueryString : ''}`}
					class="space-y-4"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							submitting = false;
						};
					}}
				>
					{#if editing}
						<input type="hidden" name="id" value={editing.id} />
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<label class="form-control">
							<span class="label-text mb-1 block">Amount</span>
							<input
								class="input input-bordered w-full"
								type="number"
								inputmode="decimal"
								name="amount"
								min="0.01"
								step="0.01"
								value={editing ? Math.abs(editing.amount) : ''}
								required
							/>
						</label>
						<label class="form-control">
							<span class="label-text mb-1 block">Date</span>
							<input
								class="input input-bordered w-full"
								type="date"
								name="date"
								value={editing?.date ?? todayISO}
								required
							/>
						</label>
					</div>

					<label class="form-control flex-row items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							name="invert_sign"
							class="checkbox checkbox-sm"
							checked={invertSign}
						/>
						<span class="label-text">Invert sign <span class="text-xs text-base-content/50">(e.g. cashback on a cost)</span></span>
					</label>

					<label class="form-control">
						<span class="label-text mb-1 block">Category</span>
						<select
							class="select select-bordered w-full"
							name="category_id"
							bind:value={selectedCategoryId}
						>
							<option value="">— none —</option>
							{#each groupedCategories as group}
								<optgroup label={group.type.charAt(0).toUpperCase() + group.type.slice(1)}>
									{#each group.cats as cat}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>

					<label class="form-control">
						<span class="label-text mb-1 block">Paid By</span>
						<select class="select select-bordered w-full" name="expense_user_id">
							<option value="">— none —</option>
							{#each Object.entries(membersMap) as [uid, name]}
								<option
									value={uid}
									selected={editing ? editing.expense_user_id === uid : uid === userId}
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
							value={editing?.description ?? ''}
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
							value={editing?.tags?.join(', ') ?? ''}
							placeholder="e.g. home, monthly"
						/>
					</label>

					{#if !editing}
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
							onclick={closeModal}
						>Cancel</button>
						<button type="submit" class="btn btn-primary" disabled={submitting}>
							{#if submitting}
								<span class="loading loading-spinner loading-sm"></span>
							{:else}
								{editing ? 'Save' : 'Add'}
							{/if}
						</button>
					</div>
				</form>
			{/key}
		</div>
	</dialog>
{/if}
