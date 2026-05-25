import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';
import { withCache, resolveCategorySign, buildAvailableYearsFromRange } from '$lib/server/movements';
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

type HomeBootstrapViewRow = {
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
			categoryIds: [] as string[],
			type: null as 'needs' | 'wants' | 'income' | 'savings' | null,
			query: '',
			tag: null as string | null
		},
		filterQueryString: ''
	};

	if (!user) return empty;

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
	if (!activeSpaceId) return empty;

	// Read home bootstrap data from a single view query. This collapses
	// membership + space + categories + movement year-range lookups.
	const bootstrap = await withCache<HomeBootstrapViewRow | null>(
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
			return (data as HomeBootstrapViewRow | null) ?? null;
		}
	);

	if (!bootstrap) return empty;

	const space: Space = {
		id: bootstrap.space_id,
		name: bootstrap.name,
		currency: bootstrap.currency,
		format: bootstrap.format,
		owner_id: bootstrap.owner_id,
		color_needs: bootstrap.color_needs,
		color_wants: bootstrap.color_wants,
		color_savings: bootstrap.color_savings,
		target_needs: bootstrap.target_needs,
		target_wants: bootstrap.target_wants,
		target_savings: bootstrap.target_savings
	};
	const categories = (bootstrap.categories ?? []) as Category[];
	const availableYears = buildAvailableYearsFromRange(
		bootstrap.oldest_movement_date,
		bootstrap.newest_movement_date
	);
	const membersMap = bootstrap.members_map ?? {};

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

	let movementsQuery = locals.supabase
		.from('costs_movements')
		.select(
			`id, amount, date, description, user_id, expense_user_id, tags, category_id, ${categoryRelation}(id, name, type)`,
			{ count: 'exact' }
		)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: false });

	if (fromDate) movementsQuery = movementsQuery.gte('date', fromDate);
	if (toDate) movementsQuery = movementsQuery.lte('date', toDate);
	if (filters.categoryIds.length > 0) movementsQuery = movementsQuery.in('category_id', filters.categoryIds);
	if (filters.type) movementsQuery = movementsQuery.eq('costs_categories.type', filters.type);
	if (filters.query) movementsQuery = movementsQuery.ilike('description', `%${filters.query}%`);
	if (filters.tag) movementsQuery = movementsQuery.contains('tags', [filters.tag]);

	const { data: movements, count, error: movError } = await movementsQuery.range(0, limit - 1);
	if (movError) console.error('[movements load]', movError);

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

// ─── Shared action utilities ──────────────────────────────────────────────────

async function getAuthContext(locals: App.Locals) {
	const { user } = await locals.safeGetSession();
	const activeSpaceId = (user?.user_metadata?.active_space_id as string | undefined) ?? null;
	return { user: user ?? null, activeSpaceId };
}

function parseMovementForm(formData: FormData) {
	const amount = parseFloat(String(formData.get('amount') ?? '').replace(',', '.'));
	const date = String(formData.get('date') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim() || null;
	const category_id = String(formData.get('category_id') ?? '').trim() || null;
	const expense_user_id = String(formData.get('expense_user_id') ?? '').trim() || null;
	const tagsRaw = String(formData.get('tags') ?? '').trim();
	const invert_sign = formData.get('invert_sign') === 'on';
	return { amount, date, description, category_id, expense_user_id, tagsRaw, invert_sign };
}

type AdminClient = NonNullable<ReturnType<typeof getAdminClient>>;

async function dispatchCreationNotifications(
	admin: AdminClient,
	payload: {
		userId: string;
		userMeta: Record<string, unknown>;
		userEmail: string | undefined;
		spaceId: string;
		movementId: string | null;
		amount: number;
		description: string | null;
		categoryName: string | null;
	}
) {
	const actorName =
		(payload.userMeta.full_name as string | undefined) ??
		(payload.userMeta.name as string | undefined) ??
		(payload.userMeta.display_name as string | undefined) ??
		payload.userEmail?.split('@')[0] ??
		'Someone';

	const [{ data: spaceData }, { data: members }] = await Promise.all([
		admin.from('costs_spaces').select('name').eq('id', payload.spaceId).single(),
		admin
			.from('costs_spaces_connections')
			.select('user_id')
			.eq('space_id', payload.spaceId)
			.neq('user_id', payload.userId)
	]);

	if (!spaceData || !members?.length) return;

	const rows = (members as Array<{ user_id: string }>).map((m) => ({
		user_id: m.user_id,
		space_id: payload.spaceId,
		movement_id: payload.movementId,
		actor_id: payload.userId,
		actor_name: actorName,
		amount: payload.amount,
		description: payload.description,
		category_name: payload.categoryName,
		space_name: spaceData.name
	}));
	await admin.from('costs_notifications').insert(rows);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export const actions: Actions = {
	createMovement: async ({ request, locals }) => {
		const { user, activeSpaceId } = await getAuthContext(locals);
		if (!user) throw redirect(303, '/login');
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const formData = await request.formData();
		const { amount, date, description, category_id, expense_user_id, tagsRaw, invert_sign } =
			parseMovementForm(formData);
		const recurring = formData.get('recurring') === 'on';

		if (isNaN(amount) || amount <= 0 || !date || !category_id)
			return fail(400, { movementError: 'Amount (positive), date, and category are required.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Service unavailable.' });

		const { sign, categoryName } = await resolveCategorySign(admin, activeSpaceId, category_id);
		const finalAmount = Math.abs(amount) * sign * (invert_sign ? -1 : 1);

		const inputTags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
		const tagsSet = new Set(inputTags);
		if (recurring) tagsSet.add('recurring');
		const tags = tagsSet.size > 0 ? Array.from(tagsSet) : null;

		const [yearRaw, monthRaw, dayRaw] = date.split('-');
		const year = Number(yearRaw);
		const month = Number(monthRaw);
		const day = Number(dayRaw);
		if (!year || !month || !day) return fail(400, { movementError: 'Invalid date.' });

		const dates = recurring
			? Array.from({ length: 12 - month + 1 }, (_, i) => {
					const nextMonth = month + i;
					const lastDay = new Date(Date.UTC(year, nextMonth, 0)).getUTCDate();
					return new Date(Date.UTC(year, nextMonth - 1, Math.min(day, lastDay)))
						.toISOString()
						.slice(0, 10);
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

		// Notifications are best-effort – never block the main response
		try {
			await dispatchCreationNotifications(admin, {
				userId: user.id,
				userMeta: user.user_metadata as Record<string, unknown>,
				userEmail: user.email,
				spaceId: activeSpaceId,
				movementId: insertedRows?.[0]?.id ?? null,
				amount: finalAmount,
				description,
				categoryName
			});
		} catch {
			// silent
		}

		return { movementSuccess: true, movementAction: 'create' };
	},

	updateMovement: async ({ request, locals }) => {
		const { user, activeSpaceId } = await getAuthContext(locals);
		if (!user) throw redirect(303, '/login');
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();
		const { amount, date, description, category_id, expense_user_id, tagsRaw, invert_sign } =
			parseMovementForm(formData);
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null;

		if (!id || isNaN(amount) || amount <= 0 || !date || !category_id)
			return fail(400, { movementError: 'Invalid data.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Service unavailable.' });

		const { sign } = await resolveCategorySign(admin, activeSpaceId, category_id);
		const finalAmount = Math.abs(amount) * sign * (invert_sign ? -1 : 1);

		const { error: err } = await admin
			.from('costs_movements')
			.update({ amount: finalAmount, date, description, category_id, expense_user_id, tags })
			.eq('id', id)
			.eq('space_id', activeSpaceId);

		if (err) return fail(500, { movementError: err.message });

		return { movementSuccess: true, movementAction: 'update' };
	},

	deleteMovement: async ({ request, locals }) => {
		const { user, activeSpaceId } = await getAuthContext(locals);
		if (!user) throw redirect(303, '/login');
		if (!activeSpaceId) return fail(400, { movementError: 'No active space.' });

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();
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
