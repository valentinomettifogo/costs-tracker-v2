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
		adapter: adapter({ runtime: 'nodejs22.x', regions: ['fra1'] })
	}
};

export default config;
