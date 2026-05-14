import { createServerClient } from '@supabase/ssr';
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
		// (layout + page) never make more than one auth.getUser() network call.
		if (event.locals._sessionCache !== undefined) {
			return event.locals._sessionCache;
		}
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		const result = error || !user ? { user: null } : { user };
		event.locals._sessionCache = result;
		return result;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};