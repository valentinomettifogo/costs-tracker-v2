import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

type Space = {
	id: string;
	name: string;
	currency: string;
	format: string;
	owner_id: string;
	created_at: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const { data: connections } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('user_id', user.id);

	const spaceIds = (connections ?? []).map((c: { space_id: string }) => c.space_id);

	let spaces: Space[] = [];
	if (spaceIds.length > 0) {
		const { data } = await locals.supabase
			.from('costs_spaces')
			.select('id, name, currency, format, owner_id, created_at')
			.in('id', spaceIds)
			.order('created_at', { ascending: false });
		spaces = (data as Space[]) ?? [];
	}

	return { spaces, userId: user.id };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const currency = String(form.get('currency') ?? 'EUR').trim();
		const format = String(form.get('format') ?? 'IT').trim();

		if (!name) return fail(400, { error: 'Il nome è obbligatorio.' });

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Servizio non disponibile.' });

		const { data: space, error: spaceErr } = await admin
			.from('costs_spaces')
			.insert({ name, currency, format, owner_id: user.id })
			.select('id')
			.single();

		if (spaceErr || !space) {
			return fail(500, { error: spaceErr?.message ?? 'Errore nella creazione dello spazio.' });
		}

		await admin
			.from('costs_spaces_connections')
			.insert({ space_id: (space as { id: string }).id, user_id: user.id });

		throw redirect(303, `/spaces/${(space as { id: string }).id}`);
	}
};
