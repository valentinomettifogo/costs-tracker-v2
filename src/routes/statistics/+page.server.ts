import { redirect } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageServerLoad } from './$types';
import { withCache, buildAvailableYearsFromRange } from '$lib/server/movements';
import { parseUrlFilters, buildDateRange, type ParsedFilters } from '$lib/server/filters';

const MAX_STATS_ROWS = 5000;

type Category = { id: string; name: string; type: string };

// Same shape and SELECT as v_space_home_bootstrap — all fields fetched so the
// in-memory cache is fully compatible with the homepage cache (same key).
type BootstrapViewRow = {
	space_id: string;
	name: string;
	currency: string;
	format: string;
	owner_id: string;
	color_needs: string;
	color_wants: string;
	color_savings: string;
	target_needs: number;
	target_wants: number;
	target_savings: number;
	categories: Category[] | null;
	members_map: Record<string, string> | null;
	oldest_movement_date: string | null;
	newest_movement_date: string | null;
};

export type StatsTotals = { income: number; needs: number; wants: number; savings: number };
export type CategoryTotal = { name: string; total: number };
export type MonthlyPoint = { label: string; sortKey: string; income: number; costs: number; savings: number };

function runStatsQuery(supabase: SupabaseClient, activeSpaceId: string, filters: ParsedFilters) {
	const today = new Date();
	const { fromDate, toDate } = buildDateRange(
		filters.year,
		filters.month,
		filters.ytd,
		today.getUTCFullYear(),
		today.toISOString().slice(0, 10)
	);

	const categoryRelation = filters.type ? 'costs_categories!inner' : 'costs_categories';

	// Lean SELECT: only what aggregation needs — no id, description, user_id, etc.
	let query = supabase
		.from('costs_movements')
		.select(`amount, date, ${categoryRelation}(name, type)`)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: true });

	if (fromDate) query = query.gte('date', fromDate);
	if (toDate) query = query.lte('date', toDate);
	if (filters.categoryIds.length > 0) query = query.in('category_id', filters.categoryIds);
	if (filters.type) query = query.eq('costs_categories.type', filters.type);
	if (filters.query) query = query.ilike('description', `%${filters.query}%`);
	if (filters.tag) query = query.contains('tags', [filters.tag]);

	return query.range(0, MAX_STATS_ROWS - 1);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;

	const empty = {
		totals: { income: 0, needs: 0, wants: 0, savings: 0 } as StatsTotals,
		categoryTotals: [] as CategoryTotal[],
		monthlyTrend: [] as MonthlyPoint[],
		categories: [] as Category[],
		availableYears: [] as number[],
		hasActiveSpace: false,
		currency: 'EUR',
		format: 'EN',
		colorNeeds: '#fbbf24',
		colorWants: '#38bdf8',
		colorSavings: '#a78bfa',
		targetNeeds: 50,
		targetWants: 30,
		targetSavings: 20,
		filters: {
			year: null as number | null,
			month: null as number | null,
			ytd: false,
			categoryIds: [] as string[],
			type: null as 'needs' | 'wants' | 'income' | 'savings' | null,
			query: '',
			tag: null as string | null
		},
		filterQueryString: ''
	};

	if (!activeSpaceId) return empty;

	// Parse filters optimistically (no availableYears validation) so the
	// stats query can run concurrently with the bootstrap query.
	const optimisticFilters = parseUrlFilters(url, {
		optimistic: true,
		defaultToCurrentPeriod: true,
		fallbackToFirstAvailableYear: true
	});

	// Reuse the same cache key as the homepage — warm if the user came from home.
	// Both pages use an identical SELECT so the cached value is always complete.
	const [bootstrap, optimisticResult] = await Promise.all([
		withCache<BootstrapViewRow | null>(
			`home-bootstrap:${user.id}:${activeSpaceId}`,
			60_000,
			async () => {
				const { data } = await locals.supabase
					.from('v_space_home_bootstrap')
					.select(
						'space_id, name, currency, format, owner_id, color_needs, color_wants, color_savings, target_needs, target_wants, target_savings, categories, members_map, oldest_movement_date, newest_movement_date'
					)
					.eq('space_id', activeSpaceId)
					.maybeSingle();
				return (data as BootstrapViewRow | null) ?? null;
			}
		),
		runStatsQuery(locals.supabase, activeSpaceId, optimisticFilters)
	]);

	if (!bootstrap) return empty;

	const categories = (bootstrap.categories ?? []) as Category[];
	const availableYears = buildAvailableYearsFromRange(
		bootstrap.oldest_movement_date,
		bootstrap.newest_movement_date
	);

	// Re-parse with the real availableYears: if the optimistic assumption was
	// wrong (e.g. current year has no data → fallback to first available year),
	// re-run the stats query with the corrected filters.
	const filters = parseUrlFilters(url, {
		availableYears,
		defaultToCurrentPeriod: true,
		fallbackToFirstAvailableYear: true
	});

	const optimisticMatched =
		filters.year === optimisticFilters.year &&
		filters.month === optimisticFilters.month &&
		filters.ytd === optimisticFilters.ytd;

	const { data: rawMovements, error: movError } = optimisticMatched
		? optimisticResult
		: await runStatsQuery(locals.supabase, activeSpaceId, filters);
	if (movError) console.error('[stats movements load]', movError);

	// ─── Server-side aggregation ─────────────────────────────────────────────
	// Only the aggregated result reaches the browser — no raw rows serialised.
	type RawRow = { amount: number; date: string; costs_categories: { name: string; type: string } | null };
	const rows = (rawMovements as unknown as RawRow[]) ?? [];

	const totals: StatsTotals = { income: 0, needs: 0, wants: 0, savings: 0 };
	const catMap = new Map<string, number>();
	const monthMap = new Map<string, MonthlyPoint>();
	const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

	for (const m of rows) {
		const type = m.costs_categories?.type;
		const catName = m.costs_categories?.name ?? 'Uncategorized';
		const sortKey = m.date.slice(0, 7); // "YYYY-MM"

		if (type === 'income') totals.income += m.amount;
		else if (type === 'needs') totals.needs -= m.amount;
		else if (type === 'wants') totals.wants -= m.amount;
		else if (type === 'savings') totals.savings -= m.amount;

		if (type !== 'income') {
			catMap.set(catName, (catMap.get(catName) ?? 0) - m.amount);
		}

		if (!monthMap.has(sortKey)) {
			const mo = parseInt(sortKey.slice(5), 10);
			const label = `${MONTH_ABBR[mo - 1]} ${sortKey.slice(2, 4)}`;
			monthMap.set(sortKey, { label, sortKey, income: 0, costs: 0, savings: 0 });
		}
		const point = monthMap.get(sortKey)!;
		if (type === 'income') point.income += m.amount;
		else if (type === 'needs' || type === 'wants') point.costs -= m.amount;
		else if (type === 'savings') point.savings -= m.amount;
	}

	const categoryTotals: CategoryTotal[] = Array.from(catMap.entries())
		.map(([name, total]) => ({ name, total }))
		.sort((a, b) => b.total - a.total);

	const monthlyTrend: MonthlyPoint[] = Array.from(monthMap.values())
		.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
		.map(p => ({ ...p, income: Math.round(p.income), costs: Math.round(p.costs), savings: Math.round(p.savings) }));

	return {
		totals,
		categoryTotals,
		monthlyTrend,
		categories,
		availableYears,
		hasActiveSpace: true,
		currency: bootstrap.currency ?? 'EUR',
		format: bootstrap.format ?? 'EN',
		colorNeeds: bootstrap.color_needs ?? '#fbbf24',
		colorWants: bootstrap.color_wants ?? '#38bdf8',
		colorSavings: bootstrap.color_savings ?? '#a78bfa',
		targetNeeds: bootstrap.target_needs ?? 50,
		targetWants: bootstrap.target_wants ?? 30,
		targetSavings: bootstrap.target_savings ?? 20,
		filters,
		filterQueryString: new URLSearchParams(url.searchParams).toString()
	};
};
