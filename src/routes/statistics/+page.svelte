<script lang="ts">
	import Chart from 'chart.js/auto';
	import ChartDataLabels from 'chartjs-plugin-datalabels';
	import { Info } from 'lucide-svelte';
	import TransactionFilters from '$lib/components/TransactionFilters.svelte';
	import type { MovementRow } from './+page.server';

	// --- TYPES ---
	interface Totals {
		income: number;
		needs: number;
		wants: number;
		savings: number;
	}

	// --- DATA ---
	let { data } = $props();

	// --- DERIVED TOTALS ---
	let totals = $derived.by<Totals>(() => {
		return (data.movements as MovementRow[]).reduce<Totals>(
			(acc, m) => {
				const type = m.costs_categories?.type;
				if (type === 'income') acc.income += m.amount;
				else if (type === 'needs') acc.needs += Math.abs(m.amount);
				else if (type === 'wants') acc.wants += Math.abs(m.amount);
				else if (type === 'savings') acc.savings += Math.abs(m.amount);
				return acc;
			},
			{ income: 0, needs: 0, wants: 0, savings: 0 }
		);
	});

	// --- IDLE MONEY ---
	let idleMoney = $derived(totals.income - totals.needs - totals.wants - totals.savings);
	let idlePercent = $derived(totals.income > 0 ? (idleMoney / totals.income) * 100 : 0);

	// --- KPI PERCENTAGES ---
	// Numeric values for math (progress bars, comparisons)
	let percentageValues = $derived({
		needs: totals.income > 0 ? (totals.needs / totals.income) * 100 : 0,
		wants: totals.income > 0 ? (totals.wants / totals.income) * 100 : 0,
		savings: totals.income > 0 ? (totals.savings / totals.income) * 100 : 0
	});
	// Formatted strings for display – respects the space locale (IT vs EN)
	let percentages = $derived({
		needs: formatPercent(percentageValues.needs),
		wants: formatPercent(percentageValues.wants),
		savings: formatPercent(percentageValues.savings)
	});

	let targets = $derived({
		needs: data.targetNeeds,
		wants: data.targetWants,
		savings: data.targetSavings
	});

	let colors = $derived({
		needs: data.colorNeeds,
		wants: data.colorWants,
		savings: data.colorSavings
	});

	// --- CHART DATA ---
	let categoryData = $derived.by(() => {
		const cats: Record<string, number> = {};
		(data.movements as MovementRow[])
			.filter((m) => m.costs_categories?.type !== 'income')
			.forEach((m) => {
				const name = m.costs_categories?.name ?? 'Uncategorized';
				cats[name] = (cats[name] || 0) + Math.abs(m.amount);
			});
		return cats;
	});

	let monthlyTrend = $derived.by(() => {
		const months: Record<string, { income: number; expenses: number; sortKey: string }> = {};
		(data.movements as MovementRow[]).forEach((m) => {
			const sortKey = m.date.slice(0, 7); // YYYY-MM for sorting
			const label = new Date(m.date + 'T00:00:00').toLocaleString('en-US', {
				month: 'short',
				year: '2-digit'
			});
			if (!months[label]) months[label] = { income: 0, expenses: 0, sortKey };
			if (m.costs_categories?.type === 'income') months[label].income += m.amount;
			else months[label].expenses += Math.abs(m.amount);
		});
		// Return sorted by date
		return Object.entries(months)
			.sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey))
			.reduce<Record<string, { income: number; expenses: number }>>((acc, [k, v]) => {
				acc[k] = { income: v.income, expenses: v.expenses };
				return acc;
			}, {});
	});

	// --- CHART LIFECYCLE ---
	const CHART_COLORS = [
		'#22c55e', '#f87272', '#fbbd23', '#37cdbe',
		'#3d4451', '#a991f7', '#f000b8', '#570df8', '#60a5fa'
	];

	let pieCanvas = $state<HTMLCanvasElement | undefined>();
	let lineCanvas = $state<HTMLCanvasElement | undefined>();
	let pieChart: Chart | undefined;
	let lineChart: Chart | undefined;

	$effect(() => {
		if (!pieCanvas || !lineCanvas) return;

		const catData = categoryData;
		const trend = monthlyTrend;

		pieChart?.destroy();
		lineChart?.destroy();

		const catLabels = Object.keys(catData);
		const catValues = Object.values(catData);
		const trendLabels = Object.keys(trend);

		const total = catValues.reduce((s, v) => s + v, 0);

		pieChart = new Chart(pieCanvas, {
			type: 'doughnut',
			plugins: [ChartDataLabels],
			data: {
				labels: catLabels,
				datasets: [{ data: catValues, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: 'transparent', cutout: '55%' } as never]
			},
			options: {
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					datalabels: {
						color: '#fff',
						font: { size: 11, weight: 'bold' },
						textShadowColor: 'rgba(0,0,0,0.4)',
						textShadowBlur: 4,
						formatter: (value: number, ctx) => {
							const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
							const label = ctx.chart.data.labels?.[ctx.dataIndex] as string ?? '';
							// Hide label on tiny slices (<4%)
							if (Number(pct) < 4) return '';
							return `${label}\n${pct}%`;
						},
						textAlign: 'center'
					}
				}
			}
		});

		lineChart = new Chart(lineCanvas, {
			type: 'line',
			data: {
				labels: trendLabels,
				datasets: [
					{
						label: 'Income',
						data: trendLabels.map((m) => trend[m].income),
						borderColor: '#36d399',
						backgroundColor: 'rgba(54, 211, 153, 0.1)',
						tension: 0.4,
						fill: true
					},
					{
						label: 'Total Expenses',
						data: trendLabels.map((m) => trend[m].expenses),
						borderColor: '#f87272',
						backgroundColor: 'rgba(248, 114, 114, 0.1)',
						tension: 0.4,
						fill: true
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'top' },
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const label = ctx.dataset.label ?? '';
								const val = ctx.parsed.y ?? 0;
								return `${label}: ${formatCurrency(val)}`;
							}
						}
					}
				}
			}
		});

		return () => {
			pieChart?.destroy();
			lineChart?.destroy();
		};
	});

	function formatCurrency(value: number): string {
		const locale = data.format === 'IT' ? 'it-IT' : 'en-US';
		const currency = data.currency ?? 'EUR';
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
	}

	function formatPercent(value: number): string {
		const locale = data.format === 'IT' ? 'it-IT' : 'en-US';
		return new Intl.NumberFormat(locale, {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).format(value);
	}
</script>

<div class="p-3 md:p-6 space-y-4 md:space-y-6 bg-base-200 min-h-screen pb-safe">

	{#if !data.hasActiveSpace}
		<div class="alert alert-warning">
			<span>No active space selected. Go to <a href="/spaces" class="link">Spaces</a> to set one up.</span>
		</div>
	{:else}
		<!-- Header -->
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-xl font-extrabold tracking-tight md:text-3xl">Financial Overview</h2>
		</div>

		<!-- Filters -->
		<TransactionFilters
			filters={data.filters}
			availableYears={data.availableYears}
			categories={data.categories}
			filterQueryString={data.filterQueryString}
			resetHref="/statistics"
		/>

		{#if data.movements.length === 0}
			<div class="card bg-base-100 shadow p-8 text-center text-base-content/60">
				No transactions found for the selected filters.
			</div>
		{:else}
			<!-- KPI Stats -->
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
				<div class="stat bg-base-100 shadow rounded-2xl p-3 md:p-4">
					<div class="stat-title text-xs">Total Income</div>
					<div class="stat-value text-success text-lg md:text-2xl break-all">{formatCurrency(totals.income)}</div>
					<div class="stat-desc text-xs">Idle: <span>{formatCurrency(idleMoney)}</span> ({formatPercent(idlePercent)}%)</div>
					<div class="w-full mt-2 rounded-full bg-base-200 h-2">
						<div class="h-2 rounded-full transition-all {idleMoney >= 0 ? 'bg-success' : 'bg-error'}" style="width:{Math.min(Math.max(idlePercent, 0), 100)}%"></div>
					</div>
				</div>

				<div class="stat bg-base-100 shadow rounded-2xl p-3 md:p-4">
					<div class="stat-title text-xs">Needs</div>
					<div class="stat-value text-lg md:text-2xl break-all" style="color:{colors.needs}">{formatCurrency(totals.needs)}</div>
					<div class="stat-desc text-xs">{percentages.needs}% <span class="opacity-50">/ {targets.needs}%</span></div>
					<div class="w-full mt-2 rounded-full bg-base-200 h-2">
						<div class="h-2 rounded-full transition-all" style="background-color:{colors.needs};width:{Math.min(percentageValues.needs / targets.needs * 100, 100)}%"></div>
					</div>
				</div>

				<div class="stat bg-base-100 shadow rounded-2xl p-3 md:p-4">
					<div class="stat-title text-xs">Wants</div>
					<div class="stat-value text-lg md:text-2xl break-all" style="color:{colors.wants}">{formatCurrency(totals.wants)}</div>
					<div class="stat-desc text-xs">{percentages.wants}% <span class="opacity-50">/ {targets.wants}%</span></div>
					<div class="w-full mt-2 rounded-full bg-base-200 h-2">
						<div class="h-2 rounded-full transition-all" style="background-color:{colors.wants};width:{Math.min(percentageValues.wants / targets.wants * 100, 100)}%"></div>
					</div>
				</div>

				<div class="stat bg-base-100 shadow rounded-2xl p-3 md:p-4">
					<div class="stat-title text-xs">Savings</div>
					<div class="stat-value text-lg md:text-2xl break-all" style="color:{colors.savings}">{formatCurrency(totals.savings)}</div>
					<div class="stat-desc text-xs">{percentages.savings}% <span class="opacity-50">/ {targets.savings}%</span></div>
					<div class="w-full mt-2 rounded-full bg-base-200 h-2">
						<div class="h-2 rounded-full transition-all" style="background-color:{colors.savings};width:{Math.min(percentageValues.savings / targets.savings * 100, 100)}%"></div>
					</div>
				</div>
			</div>

			<!-- Charts -->
			<div class="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-3 md:p-6">
						<h3 class="card-title text-sm md:text-lg mb-2">Category Breakdown</h3>
						<div class="relative h-64 md:h-80 w-full">
							<canvas bind:this={pieCanvas}></canvas>
						</div>
					</div>
				</div>

				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-3 md:p-6">
						<h3 class="card-title text-sm md:text-lg mb-2">Monthly Trend</h3>
						<div class="relative h-64 md:h-80 w-full">
							<canvas bind:this={lineCanvas}></canvas>
						</div>
					</div>
				</div>
			</div>

			<!-- Budget Insight -->
			<div class="alert bg-base-100 shadow-lg rounded-2xl border-none text-sm">
				<Info class="stroke-info shrink-0 w-5 h-5" />
				<div>
					<h3 class="font-bold text-sm">Budget Insight</h3>
					<div class="text-xs">
						Wants at {percentages.wants}% (target {targets.wants}%) · Savings at {percentages.savings}% (target {targets.savings}%).
					{#if percentageValues.savings < targets.savings}
							Consider reducing Wants to boost your savings rate.
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	canvas {
		max-width: 100%;
		max-height: 100%;
	}
</style>
