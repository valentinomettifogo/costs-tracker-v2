import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

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

type Member = {
	id: string;
	email: string;
};

type Invite = {
	id: string;
	expires_at: string;
};

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	// Verify access to the space
	const { data: conn } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('space_id', params.id)
		.eq('user_id', user.id)
		.maybeSingle();

	if (!conn) throw error(403, 'You do not have access to this space.');

	const { data: space } = await locals.supabase
		.from('costs_spaces')
		.select('id, name, currency, format, owner_id')
		.eq('id', params.id)
		.single();

	if (!space) throw error(404, 'Space not found.');

	const { data: categories } = await locals.supabase
		.from('costs_categories')
		.select('id, name, type, space_id')
		.eq('space_id', params.id)
		.order('name');

	const admin = getAdminClient();

	// Load member emails for all users in this space
	const membersMap: Record<string, string> = {};
	if (admin) {
		const { data: connections } = await admin
			.from('costs_spaces_connections')
			.select('user_id')
			.eq('space_id', params.id);

		if (connections) {
			await Promise.all(
				connections.map(async (c: { user_id: string }) => {
					const { data } = await admin.auth.admin.getUserById(c.user_id);
					if (data.user?.email) membersMap[c.user_id] = data.user.email;
				})
			);
		}
	}

	let members: Member[] = [];
	let activeInvite: Invite | null = null;

	if (space.owner_id === user.id) {
		members = Object.entries(membersMap).map(([id, email]) => ({ id, email }));

		if (admin) {
			const { data: invite } = await admin
				.from('costs_space_invites')
				.select('id, expires_at')
				.eq('space_id', params.id)
				.eq('is_active', true)
				.gt('expires_at', new Date().toISOString())
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			activeInvite = invite ?? null;
		}
	}

	return {
		space: space as Space,
		categories: (categories as Category[]) ?? [],
		userId: user.id,
		members,
		activeInvite,
		origin: url.origin
	};
};

export const actions: Actions = {
	updateSpace: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const currency = String(form.get('currency') ?? '').trim();
		const format = String(form.get('format') ?? '').trim();

		if (!name) return fail(400, { error: 'Name is required.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Service unavailable.' });

		const { error: err } = await admin
			.from('costs_spaces')
			.update({ name, currency, format })
			.eq('id', params.id)
			.eq('owner_id', user.id);

		if (err) return fail(500, { error: err.message });

		return { success: 'Space updated.' };
	},

	createCategory: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const type = String(form.get('type') ?? '').trim();

		if (!name || !type) return fail(400, { categoryError: 'Name and type are required.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { categoryError: 'Service unavailable.' });

		const { error: err } = await admin
			.from('costs_categories')
			.insert({ name, type, space_id: params.id });

		if (err) return fail(500, { categoryError: err.message });

		return {};
	},

	deleteCategory: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		const admin = getAdminClient();
		if (admin) await admin.from('costs_categories').delete().eq('id', id);

		return {};
	},

	generateInvite: async ({ locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Service unavailable.' });

		const { data: space } = await admin
			.from('costs_spaces')
			.select('owner_id')
			.eq('id', params.id)
			.single();

		if (!space || space.owner_id !== user.id) return fail(403, { error: 'Not authorized.' });

		// Disable all previous invites for this space
		await admin
			.from('costs_space_invites')
			.update({ is_active: false })
			.eq('space_id', params.id);

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const { error: err } = await admin
			.from('costs_space_invites')
			.insert({ space_id: params.id, created_by: user.id, expires_at: expiresAt.toISOString() });

		if (err) return fail(500, { error: err.message });

		return {};
	},

	revokeInvite: async ({ locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Service unavailable.' });

		const { data: space } = await admin
			.from('costs_spaces')
			.select('owner_id')
			.eq('id', params.id)
			.single();

		if (!space || space.owner_id !== user.id) return fail(403, { error: 'Not authorized.' });

		await admin
			.from('costs_space_invites')
			.update({ is_active: false })
			.eq('space_id', params.id);

		return {};
	},

	removeMember: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const targetUserId = String(form.get('userId') ?? '');

		if (!targetUserId) return fail(400, { error: 'User not specified.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Service unavailable.' });

		const { data: space } = await admin
			.from('costs_spaces')
			.select('owner_id')
			.eq('id', params.id)
			.single();

		if (!space || space.owner_id !== user.id) return fail(403, { error: 'Not authorized.' });
		if (targetUserId === space.owner_id)
			return fail(400, { error: 'You cannot remove the owner.' });

		await admin
			.from('costs_spaces_connections')
			.delete()
			.eq('space_id', params.id)
			.eq('user_id', targetUserId);

		return {};
	}
};
