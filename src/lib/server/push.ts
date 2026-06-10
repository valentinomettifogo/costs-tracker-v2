import webpush, { WebPushError } from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';

export interface PushPayload {
	title: string;
	body: string;
	url: string;
	tag: string;
	badgeCount: number;
}

interface SubscriptionRow {
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
}

const PUSH_TTL_SECONDS = 86_400; // 1 day: stale movement alerts aren't worth delivering later
const GONE_STATUS_CODES = [404, 410];

let isVapidConfigured = false;

function configureVapid(): boolean {
	if (isVapidConfigured) return true;
	if (!privateEnv.VAPID_PRIVATE_KEY || !PUBLIC_VAPID_PUBLIC_KEY) return false;
	webpush.setVapidDetails(
		privateEnv.VAPID_SUBJECT ?? 'mailto:admin@example.com',
		PUBLIC_VAPID_PUBLIC_KEY,
		privateEnv.VAPID_PRIVATE_KEY
	);
	isVapidConfigured = true;
	return true;
}

/**
 * Sends a Web Push notification to every subscribed device of the given users.
 * Stale subscriptions (404/410 from the push service) are deleted.
 * No-ops when VAPID keys are not configured (same contract as getAdminClient).
 */
export async function sendPushToUsers(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	admin: SupabaseClient<any>,
	userIds: string[],
	buildPayload: (userId: string) => PushPayload
): Promise<void> {
	if (userIds.length === 0 || !configureVapid()) return;

	const { data, error } = await admin
		.from('costs_push_subscriptions')
		.select('user_id, endpoint, p256dh, auth')
		.in('user_id', userIds);
	if (error) {
		console.error('sendPushToUsers: failed to load subscriptions:', error);
		return;
	}

	const subscriptions = (data ?? []) as SubscriptionRow[];
	if (subscriptions.length === 0) return;

	const results = await Promise.allSettled(
		subscriptions.map((sub) =>
			webpush.sendNotification(
				{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
				JSON.stringify(buildPayload(sub.user_id)),
				{ TTL: PUSH_TTL_SECONDS }
			)
		)
	);

	const staleEndpoints = results.flatMap((result, i) => {
		if (result.status !== 'rejected') return [];
		const reason = result.reason;
		if (reason instanceof WebPushError && GONE_STATUS_CODES.includes(reason.statusCode)) {
			return [subscriptions[i].endpoint];
		}
		console.error('sendPushToUsers: push delivery failed:', reason);
		return [];
	});

	if (staleEndpoints.length > 0) {
		const { error: deleteError } = await admin
			.from('costs_push_subscriptions')
			.delete()
			.in('endpoint', staleEndpoints);
		if (deleteError) {
			console.error('sendPushToUsers: failed to prune stale subscriptions:', deleteError);
		}
	}
}
