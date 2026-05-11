import type { LayoutServerLoad } from './$types';

import { getUserRole } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	const role = user ? await getUserRole(locals.supabase, user.id) : null;

	const notifications = user
		? await locals.supabase
				.from('costs_notifications')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(20)
				.then(({ data }) => data ?? [])
		: [];

	return {
		user,
		role,
		isAdmin: role === 'admin',
		currentPath: `${url.pathname}${url.search}`,
		notifications
	};
};