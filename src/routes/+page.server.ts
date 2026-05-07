import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

const DEFAULT_LIMIT = 20;
const PAGE_STEP = 20;
const MAX_LIMIT = 200;

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
	if (!user) throw redirect(303, '/login');

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;

	const empty = {
		activeSpace: null as Space | null,
		categories: [] as Category[],
		membersMap: {} as Record<string, string>,
		movements: [] as MovementRow[],
		totalMovements: 0,
		limit: DEFAULT_LIMIT,
		pageStep: PAGE_STEP
	};

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

	// Usa admin client per bypassare RLS nel join costs_categories
	const movementsClient = adminData ?? locals.supabase;
	const { data: movements, count } = await movementsClient
		.from('costs_movements')
		.select(
			'id, amount, date, description, user_id, expense_user_id, tags, category_id, costs_categories(id, name, type)',
			{ count: 'exact' }
		)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: false })
		.range(0, limit - 1);

	return {
		activeSpace: space as Space,
		categories: (categories as Category[]) ?? [],
		membersMap,
		userId: user.id,
		movements: (movements as unknown as MovementRow[]) ?? [],
		totalMovements: count ?? 0,
		limit,
		pageStep: PAGE_STEP
	};
};

export const actions: Actions = {
	createMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'Nessuno spazio attivo.' });

		const form = await request.formData();
		const amountRaw = String(form.get('amount') ?? '');
		const date = String(form.get('date') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const category_id = String(form.get('category_id') ?? '').trim() || null;
		const expense_user_id = String(form.get('expense_user_id') ?? '').trim() || null;
		const tagsRaw = String(form.get('tags') ?? '').trim();
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null;

		const amount = parseFloat(amountRaw);
		if (isNaN(amount) || amount <= 0 || !date)
			return fail(400, { movementError: 'Importo (positivo) e data obbligatori.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Servizio non disponibile.' });

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

		const { error: err } = await admin.from('costs_movements').insert({
			amount: finalAmount,
			date,
			description,
			category_id,
			expense_user_id,
			tags,
			space_id: activeSpaceId,
			user_id: user.id
		});

		if (err) return fail(500, { movementError: err.message });

		return { movementSuccess: true };
	},

	updateMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'Nessuno spazio attivo.' });

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
			return fail(400, { movementError: 'Dati non validi.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Servizio non disponibile.' });

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

		return { movementSuccess: true };
	},

	deleteMovement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
		if (!activeSpaceId) return fail(400, { movementError: 'Nessuno spazio attivo.' });

		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { movementError: 'ID non valido.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { movementError: 'Servizio non disponibile.' });

		await admin.from('costs_movements').delete().eq('id', id).eq('space_id', activeSpaceId);

		return { movementSuccess: true };
	}
};
