import adapter from '@sveltejs/adapter-vercel';

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
		}
	}
};

export default config;
