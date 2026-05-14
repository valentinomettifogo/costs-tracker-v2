<script lang="ts">
	import type { Category } from '$lib/types';
	import { buildTagFilterHref } from '$lib/utils';

	interface Filters {
		year: number | null;
		month: number | null;
		ytd: boolean;
		categoryIds: string[];
		type: string | null;
		query: string;
		tag: string | null;
	}

	interface Props {
		filters: Filters;
		availableYears: number[];
		categories: Category[];
		filterQueryString: string;
		resetHref?: string;
	}

	const { filters, availableYears, categories, filterQueryString, resetHref = '/' }: Props = $props();

	const monthOptions = [
		{ value: 1, label: 'January' },
		{ value: 2, label: 'February' },
		{ value: 3, label: 'March' },
		{ value: 4, label: 'April' },
		{ value: 5, label: 'May' },
		{ value: 6, label: 'June' },
		{ value: 7, label: 'July' },
		{ value: 8, label: 'August' },
		{ value: 9, label: 'September' },
		{ value: 10, label: 'October' },
		{ value: 11, label: 'November' },
		{ value: 12, label: 'December' }
	];

	// ── Category multi-select ────────────────────────────────────────────────
	let selectedCategoryIds = $state<string[]>([]);
	// Sync with filters prop whenever it changes (e.g. after navigation / form submit)
	$effect(() => {
		selectedCategoryIds = filters.categoryIds;
	});

	const allSelected = $derived(selectedCategoryIds.length === categories.length && categories.length > 0);
	const noneSelected = $derived(selectedCategoryIds.length === 0);
	const isPartial = $derived(!noneSelected && !allSelected);

	const categoryLabel = $derived(
		noneSelected || allSelected
			? 'All categories'
			: `${selectedCategoryIds.length} of ${categories.length} selected`
	);

	// Master checkbox needs indeterminate set as a DOM property, not an HTML attribute
	let masterCheckboxRef = $state<HTMLInputElement | undefined>();
	$effect(() => {
		if (masterCheckboxRef) masterCheckboxRef.indeterminate = isPartial;
	});

	function toggleMaster(checked: boolean) {
		selectedCategoryIds = checked ? categories.map((c) => c.id) : [];
	}

	function toggleCategory(id: string, checked: boolean) {
		selectedCategoryIds = checked
			? [...selectedCategoryIds, id]
			: selectedCategoryIds.filter((i) => i !== id);
	}

	// ── Filter panel ─────────────────────────────────────────────────────────
	let detailsRef: HTMLDetailsElement | undefined = $state();
	let categoryDetailsRef: HTMLDetailsElement | undefined = $state();

	function closeDetails() {
		if (detailsRef) detailsRef.open = false;
		if (categoryDetailsRef) categoryDetailsRef.open = false;
	}
</script>

<details bind:this={detailsRef} class="collapse collapse-arrow mb-3 rounded-box border border-base-500 bg-base-100 shadow-sm">
	<summary class="collapse-title min-h-0 py-3 text-sm font-semibold text-base-content">Filters</summary>
	<div class="collapse-content pt-1">
		{#if filters.tag}
			<div class="mb-2 flex items-center gap-2">
				<span class="text-xs text-base-content/60">Tag filter:</span>
				<a href={buildTagFilterHref(filters.tag, filters.tag, filterQueryString, resetHref)} class="badge badge-primary badge-sm">{filters.tag} ×</a>
			</div>
		{/if}
		<form method="GET" onsubmit={closeDetails} class="grid grid-cols-1 gap-2 md:grid-cols-6">
			{#if filters.tag}
				<input type="hidden" name="tag" value={filters.tag} />
			{/if}

			<label class="form-control">
				<span class="label-text text-xs">Year</span>
				<select class="select select-bordered w-full" name="year">
					<option value="">All</option>
					{#each availableYears as y}
						<option value={y} selected={filters.year === y}>{y}</option>
					{/each}
				</select>
			</label>

			<label class="form-control">
				<span class="label-text text-xs">Month</span>
				<select class="select select-bordered w-full" name="month" disabled={!filters.year}>
					<option value="">All</option>
					<option value="ytd" selected={filters.ytd}>YTD</option>
					{#each monthOptions as m}
						<option value={m.value} selected={filters.month === m.value}>{m.label}</option>
					{/each}
				</select>
			</label>

			<label class="form-control">
				<span class="label-text text-xs">Type</span>
				<select class="select select-bordered w-full" name="type">
					<option value="">All</option>
					<option value="needs" selected={filters.type === 'needs'}>Needs</option>
					<option value="wants" selected={filters.type === 'wants'}>Wants</option>
					<option value="income" selected={filters.type === 'income'}>Income</option>
					<option value="savings" selected={filters.type === 'savings'}>Savings</option>
				</select>
			</label>

			<!-- Category multi-select -->
			<div class="form-control">
				<span class="label-text text-xs">Category</span>
				<details bind:this={categoryDetailsRef} class="dropdown w-full">
					<summary class="select select-bordered flex w-full cursor-pointer items-center [&::-webkit-details-marker]:hidden marker:hidden">
						{categoryLabel}
					</summary>
					<!-- fixed positioning so the panel escapes any overflow:hidden ancestor -->
					<div class="dropdown-content fixed z-9999 mt-1 min-w-260px rounded-box border border-base-200 bg-base-100 p-2 shadow-xl">
						<!-- Master "All categories" checkbox -->
						<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-medium hover:bg-base-200">
							<input
								bind:this={masterCheckboxRef}
								type="checkbox"
								class="checkbox checkbox-sm"
								checked={allSelected}
								onchange={(e) => toggleMaster((e.currentTarget as HTMLInputElement).checked)}
							/>
							<span class="text-sm">All categories</span>
						</label>
						<div class="divider my-1"></div>
						<!-- Individual categories -->
						<ul class="max-h-56 overflow-y-auto">
							{#each categories as cat (cat.id)}
								<li>
									<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-base-200">
										<input
											type="checkbox"
											name="category"
											value={cat.id}
											class="checkbox checkbox-xs"
											checked={selectedCategoryIds.includes(cat.id)}
											onchange={(e) => toggleCategory(cat.id, (e.currentTarget as HTMLInputElement).checked)}
										/>
										<span class="text-sm">{cat.name}</span>
									</label>
								</li>
							{/each}
						</ul>
					</div>
				</details>
			</div>

			<label class="form-control">
				<span class="label-text text-xs">Search description</span>
				<input
					class="input input-bordered w-full"
					type="search"
					name="q"
					placeholder="e.g. rent, groceries"
					value={filters.query}
				/>
			</label>

			<div class="flex items-end gap-2">
				<button type="submit" class="btn btn-primary">Apply</button>
				<a href={resetHref} class="btn btn-ghost">Reset</a>
			</div>
		</form>
	</div>
</details>
