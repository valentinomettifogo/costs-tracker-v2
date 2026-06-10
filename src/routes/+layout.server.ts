import type { LayoutServerLoad } from './$types';

import { getUserRole } from '$lib/server/auth';
import type { Notification } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// The /shell route is prerendered at build time (PWA app shell): no user,
	// and url.search must not be touched during prerendering.
	if (url.pathname === '/shell') {
		return {
			user: null,
			role: null,
			// '/' (not '/shell') so that anything reading currentPath before the
			// shell's invalidateAll-goto completes points somewhere sensible.
			currentPath: '/',
			notifications: Promise.resolve([] as Notification[])
		};
	}

	const { user } = await locals.safeGetSession();

	const role = user ? await getUserRole(locals.supabase, user.id) : null;

	return {
		user,
		role,
		currentPath: `${url.pathname}${url.search}`,
		// Un-awaited promise: SvelteKit streams it after the initial HTML flush,
		// so notifications never block first paint.
		notifications: user
			? Promise.resolve(
					locals.supabase
						.from('costs_notifications')
						.select('*')
						.eq('user_id', user.id)
						.order('created_at', { ascending: false })
						.limit(20)
				).then(({ data }) => (data ?? []) as Notification[])
			: Promise.resolve([] as Notification[])
	};
};
