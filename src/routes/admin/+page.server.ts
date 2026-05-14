import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	// Reuse the role already fetched by the layout — no extra DB call needed.
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw redirect(303, '/');
	}

	return {};
};