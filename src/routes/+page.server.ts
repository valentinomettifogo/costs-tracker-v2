import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';
import { scanAvailableYears, withCache } from '$lib/server/movements';
import { parseUrlFilters, buildDateRange } from '$lib/server/filters';

const DEFAULT_LIMIT = 20;
const PAGE_STEP = 20;
const MAX_LIMIT = 200;

type Space = {
	id: string;
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
			type: null as 'needs' | 'wants' | 'income' | 'savings' | null,
			query: '',
			tag: null as string | null
		},
		filterQueryString: ''
	};

	if (!user) return empty;

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
	if (!activeSpaceId) return empty;

	const { data: conn } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('space_id', activeSpaceId)
		.eq('user_id', user.id)
		.maybeSingle();

	if (!conn) return empty;

	// Resolve admin client (sync), then run space + categories + years + membersMap
	// all in parallel. Stable data is cached for 60 s so filter changes only
	// trigger the movements query, not the full waterfall.
	const admin = getAdminClient();
	const movementsClient = admin ?? locals.supabase;

	const [space, categories, availableYears, membersMap] = await Promise.all([
		withCache<Space | null>(`home-space:${activeSpaceId}`, 60_000, async () => {
			const { data } = await locals.supabase
				.from('costs_spaces')
				.select('id, name, currency, format, owner_id, color_needs, color_wants, color_savings, target_needs, target_wants, target_savings')
				.eq('id', activeSpaceId)
				.single();
			return data as Space | null;
		}),
		withCache<Category[]>(`home-categories:${activeSpaceId}`, 60_000, async () => {
			const { data } = await locals.supabase
				.from('costs_categories')
				.select('id, name, type, space_id')
				.eq('space_id', activeSpaceId)
				.order('name');
			return (data as Category[]) ?? [];
		}),
		withCache<number[]>(`years:${activeSpaceId}`, 60_000, () =>
			scanAvailableYears(movementsClient, activeSpaceId)
		),
		admin
			? withCache<Record<string, string>>(`membersMap:${activeSpaceId}`, 5 * 60_000, async () => {
					const map: Record<string, string> = {};
					const { data: connections } = await admin
						.from('costs_spaces_connections')
						.select('user_id')
						.eq('space_id', activeSpaceId);
					if (connections) {
						await Promise.all(
							connections.map(async (c: { user_id: string }) => {
								const { data } = await admin.auth.admin.getUserById(c.user_id);
								const u = data.user;
								map[c.user_id] =
									u?.user_metadata?.display_name ??
									u?.user_metadata?.full_name ??
									u?.email ??
									c.user_id.slice(0, 8);
							})
						);
					}
					return map;
				})
			: Promise.resolve({} as Record<string, string>)
	]);

	if (!space) return empty;

	const limitParam = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
	const limit =
		isNaN(limitParam) || limitParam < DEFAULT_LIMIT
			? DEFAULT_LIMIT
			: Math.min(limitParam, MAX_LIMIT);

	const filters = parseUrlFilters(url, {
		availableYears,
		defaultToCurrentPeriod: true
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
		.select(
			`id, amount, date, description, user_id, expense_user_id, tags, category_id, ${categoryRelation}(id, name, type)`,
			{ count: 'exact' }
		)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: false });

	if (fromDate) movementsQuery = movementsQuery.gte('date', fromDate);
	if (toDate) movementsQuery = movementsQuery.lte('date', toDate);
	if (filters.categoryId) movementsQuery = movementsQuery.eq('category_id', filters.categoryId);
	if (filters.type) movementsQuery = movementsQuery.eq('costs_categories.type', filters.type);
	if (filters.query) movementsQuery = movementsQuery.ilike('description', `%${filters.query}%`);
	if (filters.tag) movementsQuery = movementsQuery.contains('tags', [filters.tag]);

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
		filters,
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
		let categoryName: string | null = null;
		if (category_id) {
			const { data: catData } = await admin
				.from('costs_categories')
				.select('type, name')
				.eq('id', category_id)
				.maybeSingle();
			isIncome = catData?.type === 'income';
			categoryName = catData?.name ?? null;
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

		const { data: insertedRows, error: err } = await admin
			.from('costs_movements')
			.insert(rows)
			.select('id')
			.limit(1);

		if (err) return fail(500, { movementError: err.message });

		// Create notifications for other space members (silent – never blocks the main flow)
		try {
			const firstMovementId = insertedRows?.[0]?.id ?? null;
			const actorName =
				(user.user_metadata?.full_name as string | undefined) ??
				(user.user_metadata?.name as string | undefined) ??
				(user.user_metadata?.display_name as string | undefined) ??
				user.email?.split('@')[0] ??
				'Someone';

			const [{ data: spaceData }, { data: members }] = await Promise.all([
				admin.from('costs_spaces').select('name').eq('id', activeSpaceId).single(),
				admin
					.from('costs_spaces_connections')
					.select('user_id')
					.eq('space_id', activeSpaceId)
					.neq('user_id', user.id)
			]);

			if (spaceData && members && members.length > 0) {
				const notificationRows = members.map((m) => ({
					user_id: m.user_id,
					space_id: activeSpaceId,
					movement_id: firstMovementId,
					actor_id: user.id,
					actor_name: actorName,
					amount: finalAmount,
					description,
					category_name: categoryName,
					space_name: spaceData.name
				}));
				await admin.from('costs_notifications').insert(notificationRows);
			}
		} catch {
			// Notifications are best-effort; do not fail the request
		}

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
