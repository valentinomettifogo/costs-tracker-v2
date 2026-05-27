<script lang="ts">
	import type { Category } from '$lib/types';
	import { buildTagFilterHref } from '$lib/utils';
	import { ChevronDown, ChevronUp, X, Filter, RotateCcw } from 'lucide-svelte';

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

	// ── Panel state ──────────────────────────────────────────────────────────
	let isPanelOpen = $state(false);
	let isCategoryDropdownOpen = $state(false);

	// ── Category multi-select ────────────────────────────────────────────────
	let selectedCategoryIds = $state<string[]>([]);
	
	// Sync with filters prop whenever it changes
	$effect(() => {
		selectedCategoryIds = filters.categoryIds;
	});

	const allSelected = $derived(selectedCategoryIds.length === categories.length && categories.length > 0);
	const noneSelected = $derived(selectedCategoryIds.length === 0);
	const isPartial = $derived(!noneSelected && !allSelected);

	const categoryLabel = $derived(
		noneSelected || allSelected
			? 'All categories'
			: `${selectedCategoryIds.length} on ${categories.length} selected`
	);

	const typeOrder = ['needs', 'wants', 'savings', 'income'];
	const typeLabels: Record<string, string> = {
		needs: 'Needs',
		wants: 'Wants',
		savings: 'Savings',
		income: 'Income'
	};

	const categoriesByType = $derived(
		categories.reduce((acc, cat) => {
			const type = cat.type || 'other';
			if (!acc[type]) acc[type] = [];
			acc[type].push(cat);
			return acc;
		}, {} as Record<string, Category[]>)
	);

	const sortedTypes = $derived(
		[...typeOrder, ...Object.keys(categoriesByType).filter((t) => !typeOrder.includes(t))]
			.filter((type) => categoriesByType[type] && categoriesByType[type].length > 0)
	);

	function toggleMaster(checked: boolean) {
		selectedCategoryIds = checked ? categories.map((c) => c.id) : [];
	}

	function toggleCategory(id: string, checked: boolean) {
		selectedCategoryIds = checked
			? [...selectedCategoryIds, id]
			: selectedCategoryIds.filter((i) => i !== id);
	}

	// ── Actions ──────────────────────────────────────────────────────────────
	function handleSubmit() {
		isPanelOpen = false;
		isCategoryDropdownOpen = false;
	}

	function handleClickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				isCategoryDropdownOpen = false;
			}
		};

		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	const inputBaseClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-400";

	// Detect if filters are actually active (excluding defaults)
	const hasActiveFilters = $derived(
		filters.type || 
		filters.query || 
		filters.tag || 
		filters.ytd ||
		(filters.categoryIds.length > 0 && filters.categoryIds.length < categories.length) ||
		// If the query string has content, it means the user manually changed something
		(filterQueryString !== '' && filterQueryString !== 'limit=')
	);
</script>

<div class="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-visible">
	<!-- Panel Header -->
	<button
		type="button"
		onclick={() => (isPanelOpen = !isPanelOpen)}
		class="flex w-full items-center justify-between px-4 py-3 text-left focus:outline-none"
	>
		<div class="flex items-center gap-2">
			<Filter size={16} class="text-gray-500" />
			<span class="text-sm font-semibold text-gray-700">Filters</span>
			{#if hasActiveFilters}
				<span class="flex h-2 w-2 rounded-full bg-primary"></span>
			{/if}
		</div>
		{#if isPanelOpen}
			<ChevronUp size={18} class="text-gray-400" />
		{:else}
			<ChevronDown size={18} class="text-gray-400" />
		{/if}
	</button>

	<!-- Panel Content -->
	{#if isPanelOpen}
		<div class="border-t border-gray-100 p-4 pt-2">
			{#if filters.tag}
				<div class="mb-4 flex items-center gap-2">
					<span class="text-xs text-gray-500 font-medium">Tag:</span>
					<a
						href={buildTagFilterHref(filters.tag, filters.tag, filterQueryString, resetHref)}
						class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
					>
						{filters.tag}
						<X size={12} />
					</a>
				</div>
			{/if}

			<form method="GET" onsubmit={handleSubmit} class="grid grid-cols-1 gap-4 md:grid-cols-6 items-end">
				{#if filters.tag}
					<input type="hidden" name="tag" value={filters.tag} />
				{/if}

				<!-- Sync categories state with form -->
				{#each selectedCategoryIds as id}
					<input type="hidden" name="category" value={id} />
				{/each}

				<!-- Year -->
				<div class="space-y-1">
					<label for="year" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Year</label>
					<select id="year" name="year" class={inputBaseClass}>
						<option value="">All</option>
						{#each availableYears as y}
							<option value={y} selected={filters.year === y}>{y}</option>
						{/each}
					</select>
				</div>

				<!-- Month -->
				<div class="space-y-1">
					<label for="month" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</label>
					<select id="month" name="month" class={inputBaseClass} disabled={!filters.year}>
						<option value="">All</option>
						<option value="ytd" selected={filters.ytd}>YTD</option>
						{#each monthOptions as m}
							<option value={m.value} selected={filters.month === m.value}>{m.label}</option>
						{/each}
					</select>
				</div>

				<!-- Type -->
				<div class="space-y-1">
					<label for="type" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
					<select id="type" name="type" class={inputBaseClass}>
						<option value="">All</option>
						<option value="needs" selected={filters.type === 'needs'}>Needs</option>
						<option value="wants" selected={filters.type === 'wants'}>Wants</option>
						<option value="income" selected={filters.type === 'income'}>Income</option>
						<option value="savings" selected={filters.type === 'savings'}>Savings</option>
					</select>
				</div>

				<!-- Category -->
				<div class="space-y-1 relative" use:handleClickOutside>
					<label for="category-btn" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
					<button
						id="category-btn"
						type="button"
						onclick={() => (isCategoryDropdownOpen = !isCategoryDropdownOpen)}
						class="{inputBaseClass} flex items-center justify-between text-left"
					>
						<span class="truncate">{categoryLabel}</span>
						<ChevronDown size={14} class="text-gray-400 shrink-0 ml-2" />
					</button>

					{#if isCategoryDropdownOpen}
						<div class="absolute left-0 top-full z-100 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
							<!-- Master Checkbox -->
							<label class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50">
								<input
									type="checkbox"
									class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
									checked={allSelected}
									indeterminate={isPartial}
									onchange={(e) => toggleMaster((e.currentTarget as HTMLInputElement).checked)}
								/>
								<span class="text-sm font-medium text-gray-700">All categories</span>
							</label>

							<div class="my-1 border-t border-gray-100"></div>

							<!-- Individual Categories -->
							<div class="max-h-60 overflow-y-auto space-y-3 custom-scrollbar">
								{#each sortedTypes as type}
									<div class="space-y-1">
										<div class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 rounded">
											{typeLabels[type] || type}
										</div>
										{#each categoriesByType[type] as cat (cat.id)}
											<label class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-gray-50">
												<input
													type="checkbox"
													class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
													checked={selectedCategoryIds.includes(cat.id)}
													onchange={(e) => toggleCategory(cat.id, (e.currentTarget as HTMLInputElement).checked)}
												/>
												<span class="text-sm text-gray-600">{cat.name}</span>
											</label>
										{/each}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Search -->
				<div class="space-y-1">
					<label for="q" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search</label>
					<input
						id="q"
						type="search"
						name="q"
						placeholder="Description..."
						value={filters.query}
						class={inputBaseClass}
					/>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<button
						type="submit"
						class="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98]"
					>
						Apply
					</button>
					<a
						href={resetHref}
						class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-100 active:scale-[0.98]"
						title="Reset filters"
					>
						<RotateCcw size={16} />
					</a>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #e5e7eb;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #d1d5db;
	}
</style>
