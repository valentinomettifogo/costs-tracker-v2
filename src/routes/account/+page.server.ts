import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearAuthCookies, getAdminClient } from '$lib/server/auth';

type OwnedSpace = { id: string; name: string; otherMembers: number };

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login?redirectTo=/account');

	const admin = getAdminClient();
	if (!admin) return { email: user.email ?? '', ownedSpaces: [] as OwnedSpace[] };

	const { data: spaces } = await admin
		.from('costs_spaces')
		.select('id, name')
		.eq('owner_id', user.id)
		.order('created_at', { ascending: true });

	const spaceIds = (spaces ?? []).map((s: { id: string }) => s.id);

	// Connections RLS only exposes the caller's own rows, so member counts
	// need the admin client.
	const { data: connections } = spaceIds.length
		? await admin
				.from('costs_spaces_connections')
				.select('space_id')
				.in('space_id', spaceIds)
				.neq('user_id', user.id)
		: { data: [] };

	const counts = new Map<string, number>();
	for (const { space_id } of (connections ?? []) as Array<{ space_id: string }>) {
		counts.set(space_id, (counts.get(space_id) ?? 0) + 1);
	}

	const ownedSpaces: OwnedSpace[] = (spaces ?? []).map((s: { id: string; name: string }) => ({
		id: s.id,
		name: s.name,
		otherMembers: counts.get(s.id) ?? 0
	}));

	return { email: user.email ?? '', ownedSpaces };
};

export const actions: Actions = {
	deleteAccount: async ({ request, locals, cookies }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');

		const form = await request.formData();
		const confirmation = String(form.get('confirmation') ?? '')
			.trim()
			.toLowerCase();
		if (!user.email || confirmation !== user.email.toLowerCase()) {
			return fail(400, { error: 'Type your email address exactly to confirm.' });
		}

		const admin = getAdminClient();
		if (!admin) return fail(500, { error: 'Service unavailable. Please try again later.' });

		// Transfers/removes app data first: if the auth deletion below fails,
		// re-running this is idempotent and the account can be retried.
		const { error: prepErr } = await admin.rpc('prepare_account_deletion', {
			_user_id: user.id
		});
		if (prepErr) {
			console.error('[account] prepare_account_deletion failed:', user.id, prepErr);
			return fail(500, { error: 'Could not delete your data. Please try again or contact me.' });
		}

		const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
		if (delErr) {
			console.error('[account] auth deleteUser failed:', user.id, delErr);
			return fail(500, {
				error: 'Your data was removed but the login could not be deleted. Please contact me.'
			});
		}

		clearAuthCookies(cookies, locals);
		throw redirect(303, '/?account_deleted=1');
	}
};
