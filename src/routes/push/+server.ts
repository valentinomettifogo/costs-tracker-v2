import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminClient } from '$lib/server/auth';

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => ({}));
	const endpoint: unknown = body?.endpoint;
	const p256dh: unknown = body?.keys?.p256dh;
	const auth: unknown = body?.keys?.auth;
	const userAgent: unknown = body?.userAgent;

	if (
		!isNonEmptyString(endpoint) ||
		!endpoint.startsWith('https://') ||
		!isNonEmptyString(p256dh) ||
		!isNonEmptyString(auth)
	) {
		throw error(400, 'Invalid subscription payload');
	}

	const admin = getAdminClient();
	if (!admin) throw error(500, 'Service unavailable');

	// Upsert on endpoint: re-subscribing is idempotent, and a different
	// account logging in on the same device takes over the subscription.
	const { error: err } = await admin.from('costs_push_subscriptions').upsert(
		{
			user_id: user.id,
			endpoint,
			p256dh,
			auth,
			user_agent: isNonEmptyString(userAgent) ? userAgent.slice(0, 500) : null
		},
		{ onConflict: 'endpoint' }
	);
	if (err) throw error(500, err.message);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => ({}));
	const endpoint: unknown = body?.endpoint;
	if (!isNonEmptyString(endpoint)) throw error(400, 'Missing endpoint');

	const admin = getAdminClient();
	if (!admin) throw error(500, 'Service unavailable');

	const { error: err } = await admin
		.from('costs_push_subscriptions')
		.delete()
		.eq('endpoint', endpoint)
		.eq('user_id', user.id);
	if (err) throw error(500, err.message);

	return json({ success: true });
};
