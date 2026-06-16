<script lang="ts">
	import {
		Chart,
		DoughnutController,
		LineController,
		ArcElement,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';
	import ChartDataLabels from 'chartjs-plugin-datalabels';

	Chart.register(
		DoughnutController, LineController,
		ArcElement, LineElement, PointElement,
		LinearScale, CategoryScale,
		Tooltip, Legend, Filler,
		ChartDataLabels
	);
	import {
		Info,
		TrendingUp,
		TrendingDown,
		PiggyBank,
		Wallet,
	} from "lucide-svelte";
	import TransactionFilters from "$lib/components/TransactionFilters.svelte";

	// --- DATA ---
	let { data } = $props();

	// --- TOTALS (aggregated server-side) ---
	const totals = $derived(data.totals);

	// --- IDLE MONEY ---
	let idleMoney = $derived(
		totals.income - totals.needs - totals.wants - totals.savings,
	);
	let idlePercent = $derived(
		totals.income > 0 ? (idleMoney / totals.income) * 100 : 0,
	);

	// --- KPI PERCENTAGES ---
	// I KPI riflettono la somma algebrica dei movimenti (anche negativi)
	let percentageValues = $derived({
		needs: totals.income > 0 ? (totals.needs / totals.income) * 100 : 0,
		wants: totals.income > 0 ? (totals.wants / totals.income) * 100 : 0,
		savings: totals.income > 0 ? (totals.savings / totals.income) * 100 : 0,
	});

	let percentages = $derived({
		needs: formatPercent(percentageValues.needs),
		wants: formatPercent(percentageValues.wants),
		savings: formatPercent(percentageValues.savings),
	});

	let targets = $derived({
		needs: data.targetNeeds,
		wants: data.targetWants,
		savings: data.targetSavings,
	});

	let colors = $derived({
		needs: data.colorNeeds,
		wants: data.colorWants,
		savings: data.colorSavings,
	});

	// --- CHART LIFECYCLE ---
	const CHART_COLORS = [
		"#42b883",
		"#ef4444",
		"#f59e0b",
		"#3b82f6",
		"#6366f1",
		"#8b5cf6",
		"#ec4899",
		"#10b981",
		"#f43f5e",
	];

	let pieCanvas = $state<HTMLCanvasElement | undefined>();
	let lineCanvas = $state<HTMLCanvasElement | undefined>();
	let pieChart: Chart | undefined;
	let lineChart: Chart | undefined;

	$effect(() => {
		if (!pieCanvas || !lineCanvas) return;

		pieChart?.destroy();
		lineChart?.destroy();

		const catLabels = data.categoryTotals.map((c) => c.name);
		// Imposta a zero i totali negativi (es. rimborsi) per il grafico a ciambella
		const catValues = data.categoryTotals.map((c) => c.total > 0 ? c.total : 0);
		const trendLabels = data.monthlyTrend.map((m) => m.label);
		const total = catValues.reduce((s, v) => s + v, 0);

		   pieChart = new Chart(pieCanvas, {
			   type: "doughnut",
			   plugins: [ChartDataLabels],
			   data: {
				   labels: catLabels,
				   datasets: [
					   {
						   data: catValues,
						   backgroundColor: CHART_COLORS,
						   borderWidth: 0,
						   cutout: "40%",
					   } as never,
				   ],
			   },
			   options: {
				   maintainAspectRatio: false,
				   plugins: {
					   legend: { display: false },
					   datalabels: {
						   color: "#fff",
						   font: { size: 10, weight: "bold" },
						   formatter: (value: number, ctx) => {
							   const pct =
								   total > 0
									   ? ((value / total) * 100).toFixed(1)
									   : "0";
							   const label =
								   (ctx.chart.data.labels?.[
									   ctx.dataIndex
								   ] as string) ?? "";
							   if (Number(pct) < 5 || value === 0) return "";
							   return `${label}\n${pct}%`;
						   },
						   textAlign: "center",
						   anchor: "center",
						   align: "center",
					   },
				   },
			   },
		   });

		lineChart = new Chart(lineCanvas, {
			type: "line",
			data: {
				labels: trendLabels,
				datasets: [
					{
						label: "Income",
						data: data.monthlyTrend.map((m) => m.income),
						borderColor: "#42b883",
						backgroundColor: "rgba(66, 184, 131, 0.1)",
						tension: 0.4,
						fill: 'origin',
						pointRadius: 4,
						pointBackgroundColor: "#fff",
						borderWidth: 3,
					},
					{
						label: "Costs",
						data: data.monthlyTrend.map((m) => m.costs),
						borderColor: "#ef4444",
						backgroundColor: "rgba(239, 68, 68, 0.1)",
						tension: 0.4,
						fill: 'origin',
						pointRadius: 4,
						pointBackgroundColor: "#fff",
						borderWidth: 3,
					},
					{
						label: "Savings+Costs",
						data: data.monthlyTrend.map((m) => m.costs + m.savings),
						borderColor: data.colorSavings,
						tension: 0.4,
						fill: false,
						pointRadius: 4,
						pointBackgroundColor: "#fff",
						borderWidth: 3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					datalabels: {
						display: 'auto',
						anchor: 'end',
						align: 'top',
						offset: 4,
						font: { size: 9, weight: 'bold' },
						color: (ctx) => ctx.dataset.borderColor as string,
						formatter: (value: number) => {
							if (value <= 0) return '';
							const locale = data.format === 'IT' ? 'it-IT' : 'en-US';
							return new Intl.NumberFormat(locale, { style: 'currency', currency: data.currency ?? 'EUR', maximumFractionDigits: 0 }).format(value);
						},
					},
					legend: {
						position: "top",
						labels: {
							usePointStyle: true,
							boxWidth: 8,
							padding: 10,
							font: { size: 12 },
							generateLabels: (chart) => {
								const originalLabels =
									Chart.defaults.plugins.legend.labels.generateLabels(
										chart,
									);

								return originalLabels.map((label) => {
									label.text = " " + label.text + " ";
									return label;
								});
							},
						},
					},
					tooltip: {
						backgroundColor: "#fff",
						titleColor: "#1f2937",
						bodyColor: "#4b5563",
						borderColor: "#e5e7eb",
						borderWidth: 1,
						padding: 12,
						boxPadding: 6,
						callbacks: {
							label: (ctx) => {
								const label = ctx.dataset.label ?? "";
								const val = ctx.parsed.y ?? 0;
								return ` ${label}: ${formatCurrency(val)}`;
							},
						},
					},
				},
				scales: {
					y: {
						grid: { display: true, color: "#f3f4f6" },
						ticks: {
							font: { size: 10 },
							callback: (value) => Math.round(Number(value)).toString(),
						},
					},
					x: {
						grid: { display: false },
						ticks: { font: { size: 10 } },
					},
				},
			},
		});

		return () => {
			pieChart?.destroy();
			lineChart?.destroy();
		};
	});

	function formatCurrency(value: number): string {
		const locale = data.format === "IT" ? "it-IT" : "en-US";
		const currency = data.currency ?? "EUR";
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
		}).format(value);
	}

	function formatPercent(value: number): string {
		const locale = data.format === "IT" ? "it-IT" : "en-US";
		return new Intl.NumberFormat(locale, {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		}).format(value);
	}
</script>

<div class="space-y-6 pb-20 md:pb-10">
	{#if !data.hasActiveSpace}
		<div
			class="rounded-xl bg-amber-50 p-4 border border-amber-100 flex items-start gap-3"
		>
			<Info class="text-amber-600 shrink-0" size={20} />
			<p class="text-sm text-amber-800 font-medium">
				No active space selected. Go to <a
					href="/spaces"
					class="text-amber-900 underline underline-offset-4 font-bold"
					>Spaces</a
				> to set one up.
			</p>
		</div>
	{:else}
		<div class="px-4 md:px-0">
			<h1 class="text-2xl font-extrabold text-gray-900 md:text-3xl">
				Financial Overview
			</h1>
		</div>

		<TransactionFilters
			filters={data.filters}
			availableYears={data.availableYears}
			categories={data.categories}
			filterQueryString={data.filterQueryString}
			resetHref="/statistics"
		/>

		{#if data.monthlyTrend.length === 0}
			<div
				class="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100"
			>
				<p class="text-gray-400 font-medium text-sm">
					No transactions found for the selected filters.
				</p>
			</div>
		{:else}
			<!-- KPI Grid -->
			<div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 px-4 md:px-0">
				<!-- Income Card -->
				<div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Income</span>
						<div class="p-1.5 rounded-lg bg-green-50 text-green-600">
							<TrendingUp size={14} />
						</div>
					</div>
					<div class="text-2xl font-black text-green-600 truncate leading-none">
						{formatCurrency(totals.income)}
					</div>
					<div class="mt-4 space-y-1.5">
						<div class="flex items-center justify-between text-[10px]">
							<span class="text-gray-400">Idle</span>
							<span class="font-bold {idleMoney >= 0 ? 'text-green-600' : 'text-red-600'}">
								{formatCurrency(idleMoney)} ({formatPercent(idlePercent)}%)
							</span>
						</div>
						<div class="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
							<div class="h-full rounded-full transition-all {idleMoney >= 0 ? 'bg-green-500' : 'bg-red-500'}" style="width:{Math.min(Math.max(idlePercent, 0), 100)}%"></div>
						</div>
					</div>
				</div>

				<!-- Needs Card -->
				<div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Needs</span>
						<div class="p-1.5 rounded-lg bg-gray-50" style="color:{colors.needs}">
							<Wallet size={14} />
						</div>
					</div>
					<div class="text-2xl font-black truncate leading-none" style="color:{colors.needs}">
						{formatCurrency(totals.needs)}
					</div>
					<div class="mt-4 space-y-1.5">
						<div class="flex items-center justify-end text-[10px] font-bold">
							<span class="text-gray-700">{percentages.needs}%</span>
							<span class="text-gray-300 ml-0.5">/{targets.needs}%</span>
						</div>
						<div class="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
							<div class="h-full rounded-full transition-all" style="background-color:{colors.needs}; width:{Math.min(Math.max(percentageValues.needs / targets.needs * 100, 0), 100)}%"></div>
						</div>
					</div>
				</div>

				<!-- Wants Card -->
				<div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wants</span>
						<div class="p-1.5 rounded-lg bg-gray-50" style="color:{colors.wants}">
							<TrendingDown size={14} />
						</div>
					</div>
					<div class="text-2xl font-black truncate leading-none" style="color:{colors.wants}">
						{formatCurrency(totals.wants)}
					</div>
					<div class="mt-4 space-y-1.5">
						<div class="flex items-center justify-end text-[10px] font-bold">
							<span class="text-gray-700">{percentages.wants}%</span>
							<span class="text-gray-300 ml-0.5">/{targets.wants}%</span>
						</div>
						<div class="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
							<div class="h-full rounded-full transition-all" style="background-color:{colors.wants}; width:{Math.min(Math.max(percentageValues.wants / targets.wants * 100, 0), 100)}%"></div>
						</div>
					</div>
				</div>

				<!-- Savings Card -->
				<div class="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Savings</span>
						<div class="p-1.5 rounded-lg bg-gray-50" style="color:{colors.savings}">
							<PiggyBank size={14} />
						</div>
					</div>
					<div class="text-2xl font-black truncate leading-none" style="color:{colors.savings}">
						{formatCurrency(totals.savings)}
					</div>
					<div class="mt-4 space-y-1.5">
						<div class="flex items-center justify-end text-[10px] font-bold">
							<span class="text-gray-700">{percentages.savings}%</span>
							<span class="text-gray-300 ml-0.5">/{targets.savings}%</span>
						</div>
						<div class="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
							<div class="h-full rounded-full transition-all" style="background-color:{colors.savings}; width:{Math.min(Math.max(percentageValues.savings / targets.savings * 100, 0), 100)}%"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Charts -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 px-4 md:px-0">
				<div
					class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
				>
					<h3
						class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6"
					>
						Category Breakdown
					</h3>
					<div class="relative h-72">
						<canvas bind:this={pieCanvas}></canvas>
					</div>
				</div>
				
				<div
					class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
				>
					<h3
						class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6"
					>
						Monthly Trend
					</h3>
					<div class="relative h-72">
						<canvas bind:this={lineCanvas}></canvas>
					</div>
				</div>
			</div>

			<!-- Insight Alert -->
			<div
				class="mx-4 md:mx-0 rounded-2xl bg-gray-900 p-5 text-white shadow-lg flex items-start gap-4"
			>
				<div class="p-2 rounded-xl bg-white/10 text-primary shrink-0">
					<Info size={24} />
				</div>
				<div>
					<h3 class="font-bold text-base">Budget Insight</h3>
					<p class="mt-1 text-sm text-gray-400 leading-relaxed">
						Your <span class="text-white font-medium">Wants</span>
						are at {percentages.wants}% of income (target {targets.wants}%).
						Savings rate is {percentages.savings}% (target {targets.savings}%).
						{#if percentageValues.savings < targets.savings}
							Consider optimizing your flexible expenses to reach
							your savings goal.
						{/if}
					</p>
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
