import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { getUserRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const role = await getUserRole(locals.supabase, user.id);

	if (role !== 'admin') {
		throw redirect(303, '/');
	}

	return {};
};