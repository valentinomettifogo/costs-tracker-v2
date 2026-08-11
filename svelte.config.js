import adapter from '@sveltejs/adapter-vercel';

// Local dev has no real env vars until .env is loaded; Vercel injects them
// directly into process.env at build time, so this is a no-op there.
try {
	process.loadEnvFile();
} catch {
	// no .env file (e.g. on Vercel) — process.env is already populated
}

const supabaseHost = new URL(process.env.PUBLIC_SUPABASE_URL).host;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Pinned to fra1 to sit next to the Supabase project (EU) — every request
		// makes multiple Postgres/Auth round trips, so region mismatch multiplies latency.
		adapter: adapter({ runtime: 'nodejs22.x', regions: ['fra1'] }),
		// Exposed client-side via `version` from '$app/environment'. Vercel injects
		// VERCEL_GIT_COMMIT_SHA at build time, so this changes on every deploy and
		// lets us show the live commit in the UI. Falls back to 'dev' locally.
		version: {
			name: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
		},
		// SvelteKit injects its own hydration bootstrap as an inline <script>, so a
		// `script-src 'self'` policy blocks it outright unless SvelteKit is the one
		// generating the header — it augments these directives with a nonce (SSR'd
		// pages) or a hash (the prerendered /shell page, where nonces don't work)
		// for every inline script/style it emits.
		// Skipped in dev: Vite's HMR needs `eval` and a `ws://localhost` connection
		// this policy doesn't allow.
		...(process.env.NODE_ENV === 'production'
			? {
					csp: {
						mode: 'auto',
						directives: {
							'default-src': ['self'],
							'script-src': ['self'],
							'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
							'font-src': ['self', 'https://fonts.gstatic.com'],
							'img-src': ['self', 'data:', 'https:'],
							'connect-src': ['self', `https://${supabaseHost}`, `wss://${supabaseHost}`],
							'worker-src': ['self'],
							'frame-ancestors': ['none'],
							'base-uri': ['self'],
							'form-action': ['self'],
							'object-src': ['none'],
							'upgrade-insecure-requests': true
						}
					}
				}
			: {})
	}
};

export default config;
