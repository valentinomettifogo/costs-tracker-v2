<script lang="ts">
	interface Category {
		id: string;
		name: string;
		type: string;
	}

	interface Filters {
		year: number | null;
		month: number | null;
		ytd: boolean;
		categoryId: string | null;
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

	function tagFilterHref(tag: string): string {
		const params = new URLSearchParams(filterQueryString);
		if (filters.tag === tag) {
			params.delete('tag');
		} else {
			params.set('tag', tag);
		}
		const qs = params.toString();
		return qs ? `?${qs}` : resetHref;
	}
</script>

<details class="collapse collapse-arrow mb-3 rounded-box border border-base-500 bg-base-100 shadow-sm">
	<summary class="collapse-title min-h-0 py-3 text-sm font-semibold text-base-content">Filters</summary>
	<div class="collapse-content pt-1">
		{#if filters.tag}
			<div class="mb-2 flex items-center gap-2">
				<span class="text-xs text-base-content/60">Tag filter:</span>
				<a href={tagFilterHref(filters.tag)} class="badge badge-primary badge-sm">{filters.tag} ×</a>
			</div>
		{/if}
		<form method="GET" class="grid grid-cols-1 gap-2 md:grid-cols-6">
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

			<label class="form-control">
				<span class="label-text text-xs">Category</span>
				<select class="select select-bordered w-full" name="category">
					<option value="">All</option>
					{#each categories as cat}
						<option value={cat.id} selected={filters.categoryId === cat.id}>{cat.name}</option>
					{/each}
				</select>
			</label>

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
