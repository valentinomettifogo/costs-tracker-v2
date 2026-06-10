import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, {
						...options,
						path: '/',
						secure: !dev
					});
				}
			}
			}
		}
	);

	event.locals.safeGetSession = async () => {
		// Cache the result within this request so multiple load functions
		// (layout + page) never verify the JWT more than once.
		if (event.locals._sessionCache !== undefined) {
			return event.locals._sessionCache;
		}
		// getClaims() verifies the JWT locally via JWKS when the project uses
		// asymmetric signing keys (no network round trip). With legacy HS256
		// keys it transparently falls back to a server-side auth call.
		// NOTE: claims are read from the access token, so any server-side
		// mutation of user_metadata (e.g. active_space_id in /spaces setActive)
		// MUST be followed by refreshSession() to mint a fresh token.
		const { data, error } = await event.locals.supabase.auth.getClaims();
		const claims = data?.claims;

		const result =
			error || !claims
				? { user: null }
				: {
						user: {
							id: claims.sub,
							email: claims.email,
							user_metadata: claims.user_metadata ?? {},
							app_metadata: claims.app_metadata ?? {},
							aud: typeof claims.aud === 'string' ? claims.aud : 'authenticated',
							created_at: ''
						} as User
					};
		event.locals._sessionCache = result;
		return result;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};