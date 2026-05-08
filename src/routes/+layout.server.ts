import type { LayoutServerLoad } from './$types';

import { getUserRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	const role = user ? await getUserRole(locals.supabase, user.id) : null;

	return {
		user,
		role,
		isAdmin: role === 'admin',
		currentPath: `${url.pathname}${url.search}`
	};
};