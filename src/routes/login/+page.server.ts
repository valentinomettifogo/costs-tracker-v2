import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (user) throw redirect(303, '/');
	const raw = url.searchParams.get('redirectTo') ?? '';
	const redirectTo = raw.startsWith('/') ? raw : '';
	return { redirectTo };
};

export const actions: Actions = {
	email: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const raw = String(formData.get('redirectTo') ?? '');
		const redirectTo = raw.startsWith('/') ? raw : '/';

		if (!email || !password) {
			return fail(400, { error: 'Email e password obbligatori.', email });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { error: error.message, email });
		}

		throw redirect(303, redirectTo);
	},
	logout: async ({ locals, cookies }) => {
		await locals.supabase.auth.signOut();
		// safeGetSession uses getClaims(), which trusts any unexpired JWT found
		// in the cookies — so make absolutely sure they are gone, even when the
		// sign-out API call fails (otherwise the user looks logged in for up to
		// the token lifetime and /login keeps bouncing back to /).
		for (const { name } of cookies.getAll()) {
			if (name.startsWith('sb-')) cookies.delete(name, { path: '/' });
		}
		locals._sessionCache = undefined;
		throw redirect(303, '/');
	}
};