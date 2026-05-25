import type { LayoutServerLoad } from './$types';

import { getUserRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	// getUserRole and notifications don't depend on each other — run in parallel.
	const [role, notifications] = await Promise.all([
		user ? getUserRole(locals.supabase, user.id) : Promise.resolve(null),
		user
			? locals.supabase
					.from('costs_notifications')
					.select('*')
					.eq('user_id', user.id)
					.order('created_at', { ascending: false })
					.limit(20)
					.then(({ data }) => data ?? [])
			: Promise.resolve([])
	]);

	return {
		user,
		role,
		currentPath: `${url.pathname}${url.search}`,
		notifications
	};
};