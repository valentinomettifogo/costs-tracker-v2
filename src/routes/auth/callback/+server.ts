import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const { data: session, error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error.status);
			throw redirect(303, '/login?error=callback_failed');
		}
		if (!session?.user) {
			console.error('[auth/callback] exchangeCodeForSession: no user in response');
			throw redirect(303, '/login?error=no_user');
		}
	}

	throw redirect(303, '/');
};