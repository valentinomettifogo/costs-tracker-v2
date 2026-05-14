import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';
import { scanAvailableYears, withCache } from '$lib/server/movements';
import { parseUrlFilters, buildDateRange } from '$lib/server/filters';

const MAX_STATS_ROWS = 5000;

type Category = {
	id: string;
	name: string;
	type: string;
};

export type MovementRow = {
	id: string;
	amount: number;
	date: string;
	description: string | null;
	category_id: string | null;
	costs_categories: { id: string; name: string; type: string } | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;

	const empty = {
		movements: [] as MovementRow[],
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

	const admin = getAdminClient();
	const movementsClient = admin ?? locals.supabase;

	type StatsSpaceData = {
		currency: string; format: string;
		color_needs: string; color_wants: string; color_savings: string;
		target_needs: number; target_wants: number; target_savings: number;
	};

	// Run conn-check + all stable queries in parallel; cache space/categories/years
	// so filter changes only trigger the movements query.
	const [connResult, space, categories, availableYears] = await Promise.all([
		locals.supabase
			.from('costs_spaces_connections')
			.select('space_id')
			.eq('space_id', activeSpaceId)
			.eq('user_id', user.id)
			.maybeSingle(),
		withCache<StatsSpaceData | null>(`stats-space:${activeSpaceId}`, 60_000, async () => {
			const { data } = await locals.supabase
				.from('costs_spaces')
				.select('currency, format, color_needs, color_wants, color_savings, target_needs, target_wants, target_savings')
				.eq('id', activeSpaceId)
				.single();
			return data as StatsSpaceData | null;
		}),
		withCache<Category[]>(`stats-categories:${activeSpaceId}`, 60_000, async () => {
			const { data } = await locals.supabase
				.from('costs_categories')
				.select('id, name, type')
				.eq('space_id', activeSpaceId)
				.order('name');
			return (data as Category[]) ?? [];
		}),
		withCache<number[]>(`years:${activeSpaceId}`, 60_000, () =>
			scanAvailableYears(movementsClient, activeSpaceId)
		)
	]);

	if (!connResult.data) return empty;

	const filters = parseUrlFilters(url, {
		availableYears,
		defaultYtd: true,
		fallbackToFirstAvailableYear: true
	});

	const today = new Date();
	const { fromDate, toDate } = buildDateRange(
		filters.year,
		filters.month,
		filters.ytd,
		today.getUTCFullYear(),
		today.toISOString().slice(0, 10)
	);

	const categoryRelation = filters.type ? 'costs_categories!inner' : 'costs_categories';

	let movementsQuery = movementsClient
		.from('costs_movements')
		.select(`id, amount, date, description, category_id, ${categoryRelation}(id, name, type)`)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: true });

	if (fromDate) movementsQuery = movementsQuery.gte('date', fromDate);
	if (toDate) movementsQuery = movementsQuery.lte('date', toDate);
	if (filters.categoryIds.length > 0) movementsQuery = movementsQuery.in('category_id', filters.categoryIds);
	if (filters.type) movementsQuery = movementsQuery.eq('costs_categories.type', filters.type);
	if (filters.query) movementsQuery = movementsQuery.ilike('description', `%${filters.query}%`);
	if (filters.tag) movementsQuery = movementsQuery.contains('tags', [filters.tag]);

	const { data: movements } = await movementsQuery.range(0, MAX_STATS_ROWS - 1);

	return {
		movements: (movements as unknown as MovementRow[]) ?? [],
		categories: (categories as Category[]) ?? [],
		availableYears,
		hasActiveSpace: true,
		currency: space?.currency ?? 'EUR',
		format: space?.format ?? 'EN',
		colorNeeds: space?.color_needs ?? '#fbbf24',
		colorWants: space?.color_wants ?? '#38bdf8',
		colorSavings: space?.color_savings ?? '#a78bfa',
		targetNeeds: space?.target_needs ?? 50,
		targetWants: space?.target_wants ?? 30,
		targetSavings: space?.target_savings ?? 20,
		filters,
		filterQueryString: new URLSearchParams(url.searchParams).toString()
	};
};
