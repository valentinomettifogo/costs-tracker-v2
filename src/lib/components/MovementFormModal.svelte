<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Category, MovementRow } from '$lib/types';
	import { X, Save, AlertCircle, ArrowLeftRight } from 'lucide-svelte';

	interface Props {
		categories: Category[];
		membersMap: Record<string, string>;
		userId: string;
		onClose: () => void;
		editing?: MovementRow | null;
	}

	let { categories, membersMap, userId, onClose, editing = null }: Props = $props();

	let movementError = $state<string | null>(null);
	let submitting = $state(false);
	let selectedCategoryId = $state('');

	$effect(() => {
		selectedCategoryId = editing?.category_id ?? '';
	});

	// Group categories by type
	const groupedCategories = $derived.by(() => {
		const groups: Record<string, Category[]> = {};
		categories.forEach(cat => {
			if (!groups[cat.type]) groups[cat.type] = [];
			groups[cat.type].push(cat);
		});
		return groups;
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !submitting) onClose();
	}
</script>

<!-- TOFIX: il recurring non funziona se faccio "edit" quindi o lo disabilito o lo faccio funzionare -->
<!-- TOFIX: un sacco di warning da vscode -->
<div
	class="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
	onclick={handleBackdropClick}
	role="presentation"
>
	<div
		class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-200 sm:slide-in-from-bottom-0"
		role="dialog"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
			<h3 class="text-lg font-bold text-gray-900">
				{editing ? 'Edit Transaction' : 'New Transaction'}
			</h3>
			<button
				type="button"
				class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
				onclick={onClose}
				disabled={submitting}
			>
				<X size={20} />
			</button>
		</div>

		<!-- Body -->
		<div class="p-6">
			{#if movementError}
				<div class="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
					<AlertCircle size={18} class="shrink-0" />
					<p>{movementError}</p>
				</div>
			{/if}

			<form
				method="POST"
				action={editing ? '?/updateMovement' : '?/createMovement'}
				use:enhance={() => {
					submitting = true;
					movementError = null;
					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'failure') {
							movementError = (result.data?.message as string) ?? 'An error occurred';
						} else if (result.type === 'success' || result.type === 'redirect') {
							await update(); // Refreshes page data and invalidates cache
							onClose();
						}
					};
				}}
				class="space-y-4"
			>
				{#if editing}
					<input type="hidden" name="id" value={editing.id} />
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Amount -->
					<div class="space-y-1">
						<label for="amount" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</label>
						<input
							id="amount"
							name="amount"
							type="text"
							class="input-base"
							inputmode="decimal"
							placeholder="0.00"
							required
							value={editing ? Math.abs(editing.amount) : ''}
						/>
					</div>

					<!-- Date -->
					<div class="space-y-1">
						<label for="date" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
						<input
							id="date"
							name="date"
							type="date"
							class="input-base"
							required
							value={editing?.date ?? new Date().toISOString().split('T')[0]}
						/>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-1">
					<label for="description" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
					<input
						id="description"
						name="description"
						type="text"
						class="input-base"
						placeholder="What was it for?"
						required
						value={editing?.description ?? ''}
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Category -->
					<div class="space-y-1">
						<label for="category_id" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
						<select
							id="category_id"
							name="category_id"
							class="input-base"
							required
							bind:value={selectedCategoryId}
						>
							<option value="" disabled selected={!editing}>Select a category</option>
							{#each Object.entries(groupedCategories) as [type, cats]}
								<optgroup label={type.toUpperCase()}>
									{#each cats as cat}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>

					<!-- Paid By -->
					<div class="space-y-1">
						<label for="expense_user_id" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid By</label>
						<select id="expense_user_id" name="expense_user_id" class="input-base" required>
							{#each Object.entries(membersMap) as [uid, name]}
								<option value={uid} selected={editing ? editing.expense_user_id === uid : uid === userId}>
									{name}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Tags -->
				<div class="space-y-1">
					<label for="tags" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags (optional)</label>
					<input
						id="tags"
						name="tags"
						type="text"
						class="input-base"
						placeholder="tag1, tag2"
						value={editing?.tags?.join(', ') ?? ''}
					/>
				</div>

				<div class="flex flex-col gap-3 pt-2">
					<!-- Invert Sign -->
					<div class="flex items-center gap-3">
						<input
							id="invert_sign"
							type="checkbox"
							name="invert_sign"
							class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
						/>
						<label for="invert_sign" class="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
							<ArrowLeftRight size={14} class="text-gray-400" />
							Invert amount sign (+/-)
						</label>
					</div>

					<!-- Recurring -->
					<div class="flex items-center gap-3">
						<input
							id="recurring"
							type="checkbox"
							name="recurring"
							class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
						/>
						<label for="recurring" class="text-sm font-medium text-gray-700 cursor-pointer">
							Create monthly for the whole year
						</label>
					</div>
				</div>

				<!-- Footer -->
				<div class="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
					<button
						type="button"
						class="btn btn-outline flex-1 sm:flex-none"
						onclick={onClose}
						disabled={submitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary flex-1 sm:flex-none gap-2"
						disabled={submitting}
					>
						{#if submitting}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
						{:else}
							<Save size={18} />
						{/if}
						{editing ? 'Update' : 'Save'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
