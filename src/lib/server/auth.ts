import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { withCache } from './movements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminClient(): SupabaseClient<any> | null {
	if (adminClient) return adminClient;
	if (!privateEnv.SUPABASE_SERVICE_ROLE_KEY) return null;
	adminClient = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	return adminClient;
}

export async function getUserRole(supabase: App.Locals['supabase'], userId: string) {
	return withCache(`user-role:${userId}`, 300_000, async () => {
		const roleReader = getAdminClient() ?? supabase;
		const { data, error } = await roleReader
			.from('user_roles')
			.select('role')
			.eq('user_id', userId)
			.maybeSingle();
		if (error) {
			console.error(`getUserRole error for ${userId}:`, error);
			return null;
		}
		return typeof data?.role === 'string' ? data.role.trim().toLowerCase() : null;
	});
}