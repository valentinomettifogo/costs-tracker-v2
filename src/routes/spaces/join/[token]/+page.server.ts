import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminClient } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	const admin = getAdminClient();
	if (!admin) return { error: 'service_unavailable' as const };

	const { data: invite } = await admin
		.from('costs_space_invites')
		.select('id, space_id, expires_at')
		.eq('id', params.token)
		.eq('is_active', true)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();

	if (!invite) return { error: 'invalid' as const };

	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, `/login?redirectTo=/spaces/join/${params.token}`);
	}

	// Upsert: insert only if not already a member
	const { data: existing } = await admin
		.from('costs_spaces_connections')
		.select('user_id')
		.eq('space_id', invite.space_id)
		.eq('user_id', user.id)
		.maybeSingle();

	if (!existing) {
		await admin
			.from('costs_spaces_connections')
			.insert({ space_id: invite.space_id, user_id: user.id });
	}

	throw redirect(303, `/spaces/${invite.space_id}`);
};
