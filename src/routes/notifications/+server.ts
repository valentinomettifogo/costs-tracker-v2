import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminClient } from '$lib/server/auth';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => ({}));
	const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
	const all: boolean = body?.all === true;

	const admin = getAdminClient();
	if (!admin) throw error(500, 'Service unavailable');

	let query = admin
		.from('costs_notifications')
		.update({ read: true })
		.eq('user_id', user.id);

	if (!all && ids && ids.length > 0) {
		query = query.in('id', ids);
	}

	const { error: err } = await query;
	if (err) throw error(500, err.message);

	return json({ success: true });
};
