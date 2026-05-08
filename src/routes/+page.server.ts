import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

const DEFAULT_LIMIT = 20;
const PAGE_STEP = 20;
const MAX_LIMIT = 200;
const YEARS_SCAN_PAGE_SIZE = 1000;
const YEARS_SCAN_MAX_ROWS = 10000;

type Space = {
	id: string;
	name: string;
	currency: string;
	format: string;
	owner_id: string;
};

type Category = {
	id: string;
	name: string;
	type: string;
	space_id: string;
};

export type MovementRow = {
	id: string;
	amount: number;
	date: string;
	description: string | null;
	user_id: string;
	expense_user_id: string | null;
	tags: string[] | null;
	category_id: string | null;
	costs_categories: { id: string; name: string; type: string } | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	const empty = {
		activeSpace: null as Space | null,
		categories: [] as Category[],
		availableYears: [] as number[],
		membersMap: {} as Record<string, string>,
		movements: [] as MovementRow[],
		totalMovements: 0,
		limit: DEFAULT_LIMIT,
		pageStep: PAGE_STEP,
		filters: {
			year: null as number | null,
			month: null as number | null,
			ytd: false,
			categoryId: null as string | null,
			query: '',
			tag: null as string | null
		},
		filterQueryString: ''
	};

	if (!user) return empty;

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
	if (!activeSpaceId) return empty;

	// Verifica accesso
	const { data: conn } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('space_id', activeSpaceId)
		.eq('user_id', user.id)
		.maybeSingle();

	if (!conn) return empty;

	const { data: space } = await locals.supabase
		.from('costs_spaces')
		.select('id, name, currency, format, owner_id')
		.eq('id', activeSpaceId)
		.single();

	if (!space) return empty;

	const [{ data: categories }, adminData] = await Promise.all([
		locals.supabase
			.from('costs_categories')
			.select('id, name, type, space_id')
			.eq('space_id', activeSpaceId)
			.order('name'),
		Promise.resolve(getAdminClient())
	]);

	const membersMap: Record<string, string> = {};
	if (adminData) {
		const { data: connections } = await adminData
			.from('costs_spaces_connections')
			.select('user_id')
			.eq('space_id', activeSpaceId);

		if (connections) {
			await Promise.all(
				connections.map(async (c: { user_id: string }) => {
					const { data } = await adminData.auth.admin.getUserById(c.user_id);
					const u = data.user;
					membersMap[c.user_id] =
						u?.user_metadata?.display_name ??
						u?.user_metadata?.full_name ??
						u?.email ??
						c.user_id.slice(0, 8);
				})
			);
		}
	}

	const limitParam = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
	const limit =
		isNaN(limitParam) || limitParam < DEFAULT_LIMIT
			? DEFAULT_LIMIT
			: Math.min(limitParam, MAX_LIMIT);

	const yearRaw = url.searchParams.get('year')?.trim() ?? '';
	const monthRaw = url.searchParams.get('month')?.trim() ?? '';
	const ytdRaw = url.searchParams.get('ytd')?.trim().toLowerCase() ?? '';
	const hasYearParam = url.searchParams.has('year');
	const hasMonthParam = url.searchParams.has('month');
	const hasYtdParam = url.searchParams.has('ytd');
	const categoryId = url.searchParams.get('category')?.trim() || null;
	const query = (url.searchParams.get('q')?.trim() ?? '').slice(0, 100);
	const tag = (url.searchParams.get('tag')?.trim() ?? '').slice(0, 40) || null;

	const parsedYear = Number.parseInt(yearRaw, 10);
	const parsedMonth = Number.parseInt(monthRaw, 10);
	let year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : null;
	const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null;
	const ytd = ['1', 'true', 'on', 'yes'].includes(ytdRaw);

	const today = new Date();
	const todayIso = today.toISOString().slice(0, 10);
	const currentYear = today.getUTCFullYear();
	const currentMonth = today.getUTCMonth() + 1;

	// Usa admin client per bypassare RLS nel join costs_categories
	const movementsClient = adminData ?? locals.supabase;

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
	const useCurrentPeriodDefaults = !hasYearParam && !hasMonthParam && !hasYtdParam;
	if (useCurrentPeriodDefaults) {
		year = availableYears.includes(currentYear) ? currentYear : year;
	}

	if (year && !availableYears.includes(year)) {
		year = null;
	}

	const monthForFiltering = ytd
		? null
		: year
			? useCurrentPeriodDefaults && !hasMonthParam
				? currentMonth
				: month
			: null;

	let fromDate: string | null = null;
	let toDate: string | null = null;

	if (ytd) {
		fromDate = `${currentYear}-01-01`;
		toDate = todayIso;
	} else if (year && monthForFiltering) {
		const monthPadded = String(monthForFiltering).padStart(2, '0');
		const lastDay = new Date(Date.UTC(year, monthForFiltering, 0)).getUTCDate();
		fromDate = `${year}-${monthPadded}-01`;
		toDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
	} else if (year) {
		fromDate = `${year}-01-01`;
		toDate = `${year}-12-31`;
	}

	let movementsQuery = movementsClient
		.from('costs_movements')
		.select(
			'id, amount, date, description, user_id, expense_user_id, tags, category_id, costs_categories(id, name, type)',
			{ count: 'exact' }
		)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: false });

	if (fromDate) movementsQuery = movementsQuery.gte('date', fromDate);
	if (toDate) movementsQuery = movementsQuery.lte('date', toDate);
	if (categoryId) movementsQuery = movementsQuery.eq('category_id', categoryId);
	if (query) movementsQuery = movementsQuery.ilike('description', `%${query}%`);
	if (tag) movementsQuery = movementsQuery.contains('tags', [tag]);

	const { data: movements, count } = await movementsQuery.range(0, limit - 1);

	const filterParams = new URLSearchParams(url.searchParams);
	filterParams.delete('limit');

	return {
		activeSpace: space as Space,
		categories: (categories as Category[]) ?? [],
		availableYears,
		membersMap,
		userId: user.id,
		movements: (movements as unknown as MovementRow[]) ?? [],
		totalMovements: count ?? 0,
		limit,
		pageStep: PAGE_STEP,
		filters: {
			year,
			month: monthForFiltering,
			ytd,
			categoryId,
			query,
			tag
		},
		filterQueryString: filterParams.toString()
	};
};

export const actions: Actions = {
	createMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const form = await request.formData();
		const amountRaw = String(form.get('amount') ?? '');
		const date = String(form.get('date') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const category_id = String(form.get('category_id') ?? '').trim() || null;
		const expense_user_id = String(form.get('expense_user_id') ?? '').trim() || null;
		const tagsRaw = String(form.get('tags') ?? '').trim();
		const recurring = form.get('recurring') === 'on';
		const inputTags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
		const tagsSet = new Set(inputTags);
		if (recurring) tagsSet.add('recurring');
		const tags = tagsSet.size > 0 ? Array.from(tagsSet) : null;

		const amount = parseFloat(amountRaw);
		if (isNaN(amount) || amount <= 0 || !date)
			return fail(400, { movementError: 'Amount (positive) and date are required.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Service unavailable.' });

		// Determine sign from category type
		let isIncome = false;
		if (category_id) {
			const { data: catData } = await admin
				.from('costs_categories')
				.select('type')
				.eq('id', category_id)
				.maybeSingle();
			isIncome = catData?.type === 'income';
		}
		const invert_sign = form.get('invert_sign') === 'on';
		const sign = (isIncome ? 1 : -1) * (invert_sign ? -1 : 1);
		const finalAmount = Math.abs(amount) * sign;

		const [yearRaw, monthRaw, dayRaw] = date.split('-');
		const year = Number(yearRaw);
		const month = Number(monthRaw);
		const day = Number(dayRaw);
		if (!year || !month || !day) {
			return fail(400, { movementError: 'Invalid date.' });
		}

		const dates = recurring
			? Array.from({ length: 12 - month + 1 }, (_, i) => {
					const nextMonth = month + i;
					const lastDayInMonth = new Date(Date.UTC(year, nextMonth, 0)).getUTCDate();
					const recurringDay = Math.min(day, lastDayInMonth);
					return new Date(Date.UTC(year, nextMonth - 1, recurringDay)).toISOString().slice(0, 10);
				})
			: [date];

		const rows = dates.map((movementDate) => ({
			amount: finalAmount,
			date: movementDate,
			description,
			category_id,
			expense_user_id,
			tags,
			space_id: activeSpaceId,
			user_id: user.id
		}));

		const { error: err } = await admin.from('costs_movements').insert(rows);

		if (err) return fail(500, { movementError: err.message });

		return { movementSuccess: true, movementAction: 'create' };
	},

	updateMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const amountRaw = String(form.get('amount') ?? '');
		const date = String(form.get('date') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const category_id = String(form.get('category_id') ?? '').trim() || null;
		const expense_user_id = String(form.get('expense_user_id') ?? '').trim() || null;
		const tagsRaw = String(form.get('tags') ?? '').trim();
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null;

		const amount = parseFloat(amountRaw);
		if (!id || isNaN(amount) || amount <= 0 || !date)
			return fail(400, { movementError: 'Invalid data.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Service unavailable.' });

		// Determine sign from category type
		let isIncome = false;
		if (category_id) {
			const { data: catData } = await admin
				.from('costs_categories')
				.select('type')
				.eq('id', category_id)
				.maybeSingle();
			isIncome = catData?.type === 'income';
		}
		const invert_sign = form.get('invert_sign') === 'on';
		const sign = (isIncome ? 1 : -1) * (invert_sign ? -1 : 1);
		const finalAmount = Math.abs(amount) * sign;

		const { error: err } = await admin
			.from('costs_movements')
			.update({ amount: finalAmount, date, description, category_id, expense_user_id, tags })
			.eq('id', id)
			.eq('space_id', activeSpaceId);

		if (err) return fail(500, { movementError: err.message });

		return { movementSuccess: true, movementAction: 'update' };
	},

	deleteMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { movementError: 'Invalid ID.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Service unavailable.' });

		const { error: err } = await admin
			.from('costs_movements')
			.delete()
			.eq('id', id)
			.eq('space_id', activeSpaceId);

		if (err) return fail(500, { movementError: err.message });

		return { movementSuccess: true, movementAction: 'delete' };
	}
};
