import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

const YEARS_SCAN_PAGE_SIZE = 1000;
const YEARS_SCAN_MAX_ROWS = 10000;
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

const VALID_TYPES = ['needs', 'wants', 'income', 'savings'] as const;
type CategoryType = (typeof VALID_TYPES)[number];

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
			categoryId: null as string | null,
			type: null as CategoryType | null,
			query: '',
			tag: null as string | null
		},
		filterQueryString: ''
	};

	if (!activeSpaceId) return empty;

	const { data: conn } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('space_id', activeSpaceId)
		.eq('user_id', user.id)
		.maybeSingle();

	if (!conn) return empty;

	const { data: space } = await locals.supabase
		.from('costs_spaces')
		.select('currency, format, color_needs, color_wants, color_savings, target_needs, target_wants, target_savings')
		.eq('id', activeSpaceId)
		.single();

	const adminData = getAdminClient();
	const movementsClient = adminData ?? locals.supabase;

	const { data: categories } = await locals.supabase
		.from('costs_categories')
		.select('id, name, type')
		.eq('space_id', activeSpaceId)
		.order('name');

	// Scan available years
	const yearSet = new Set<number>();
	let scannedRows = 0;
	let from = 0;

	while (scannedRows < YEARS_SCAN_MAX_ROWS) {
		const to = from + YEARS_SCAN_PAGE_SIZE - 1;
		const { data: dateRows } = await movementsClient
			.from('costs_movements')
			.select('date')
			.eq('space_id', activeSpaceId)
			.order('date', { ascending: false })
			.range(from, to);

		if (!dateRows || dateRows.length === 0) break;

		for (const row of dateRows as Array<{ date: string | null }>) {
			if (!row.date) continue;
			const y = Number.parseInt(row.date.slice(0, 4), 10);
			if (Number.isInteger(y)) yearSet.add(y);
		}

		scannedRows += dateRows.length;
		if (dateRows.length < YEARS_SCAN_PAGE_SIZE) break;
		from += YEARS_SCAN_PAGE_SIZE;
	}

	const availableYears = Array.from(yearSet).sort((a, b) => b - a);

	// Parse URL filters
	const yearRaw = url.searchParams.get('year')?.trim() ?? '';
	const monthRaw = url.searchParams.get('month')?.trim() ?? '';
	const hasYearParam = url.searchParams.has('year');
	const hasMonthParam = url.searchParams.has('month');
	const ytd = monthRaw === 'ytd' || (!hasYearParam && !hasMonthParam);
	const categoryId = url.searchParams.get('category')?.trim() || null;
	const query = (url.searchParams.get('q')?.trim().toLowerCase() ?? '').slice(0, 100);
	const tag = (url.searchParams.get('tag')?.trim() ?? '').slice(0, 40) || null;

	const typeRaw = url.searchParams.get('type')?.trim().toLowerCase() ?? '';
	const type: CategoryType | null = (VALID_TYPES as readonly string[]).includes(typeRaw)
		? (typeRaw as CategoryType)
		: null;

	const parsedYear = Number.parseInt(yearRaw, 10);
	const parsedMonth = Number.parseInt(monthRaw, 10);

	const today = new Date();
	const todayIso = today.toISOString().slice(0, 10);
	const currentYear = today.getUTCFullYear();

	// Default to current year; for stats we default to full year (no specific month)
	const useYearDefault = !hasYearParam;
	let year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
		? parsedYear
		: null;

	if (useYearDefault) {
		year = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? null);
	}
	if (year && !availableYears.includes(year)) year = null;

	const month =
		ytd || !year
			? null
			: Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
				? parsedMonth
				: null;

	let fromDate: string | null = null;
	let toDate: string | null = null;

	if (ytd) {
		const ytdYear = year ?? currentYear;
		fromDate = `${ytdYear}-01-01`;
		toDate = ytdYear === currentYear ? todayIso : `${ytdYear}-12-31`;
	} else if (year && month) {
		const monthPadded = String(month).padStart(2, '0');
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		fromDate = `${year}-${monthPadded}-01`;
		toDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
	} else if (year) {
		fromDate = `${year}-01-01`;
		toDate = `${year}-12-31`;
	}

	const categoryRelation = type ? 'costs_categories!inner' : 'costs_categories';

	let movementsQuery = movementsClient
		.from('costs_movements')
		.select(`id, amount, date, description, category_id, ${categoryRelation}(id, name, type)`)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: true });

	if (fromDate) movementsQuery = movementsQuery.gte('date', fromDate);
	if (toDate) movementsQuery = movementsQuery.lte('date', toDate);
	if (categoryId) movementsQuery = movementsQuery.eq('category_id', categoryId);
	if (type) movementsQuery = movementsQuery.eq('costs_categories.type', type);
	if (query) movementsQuery = movementsQuery.ilike('description', `%${query}%`);
	if (tag) movementsQuery = movementsQuery.contains('tags', [tag]);

	const { data: movements } = await movementsQuery.range(0, MAX_STATS_ROWS - 1);

	const filterParams = new URLSearchParams(url.searchParams);

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
		filters: {
			year,
			month,
			ytd,
			categoryId,
			type,
			query,
			tag
		},
		filterQueryString: filterParams.toString()
	};
};
