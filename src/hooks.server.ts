import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

// Best-effort per-IP throttle for auth routes. In-memory, so it resets on cold
// start and isn't shared across serverless instances — it's a defense-in-depth
// layer on top of Supabase GoTrue's own (authoritative) rate limiting, not a
// replacement for it.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
	const now = Date.now();
	// Bound memory under sustained abuse instead of pruning per-entry.
	if (rateLimitBuckets.size > 5000) rateLimitBuckets.clear();

	const bucket = rateLimitBuckets.get(key);
	if (!bucket || now > bucket.resetAt) {
		rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	bucket.count += 1;
	return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (
		event.request.method === 'POST' &&
		(event.url.pathname.startsWith('/login') || event.url.pathname.startsWith('/auth'))
	) {
		const key = `${event.getClientAddress()}:${event.url.pathname}`;
		if (isRateLimited(key)) {
			return new Response('Too many requests, please try again later.', { status: 429 });
		}
	}

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

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	// The whole app is private/invite-only: keep it out of search results even
	// if a page's own robots meta tag is ever missed.
	response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	// Skip in dev: HSTS has no meaning over plain http://localhost. The CSP
	// header itself is set by SvelteKit (see the `csp` option in svelte.config.js),
	// which also handles Vite's HMR requirements in dev automatically.
	if (!dev) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}

	return response;
};