# Costs Tracker v2

Web app for tracking personal and shared expenses with spaces, categories, invite links, and Supabase authentication.

**[Live app →](https://budget.valentinomettifogo.com/)**

## Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | SvelteKit | 2.x |
| UI | Svelte 5 (runes) | 5.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Auth + DB | Supabase (Auth + Postgres) | — |
| Icons / Charts | lucide-svelte / Chart.js | — |

## Main Features

- Email/password login and Google OAuth login
- Multi-space management (create, select active, edit)
- Space invite links with expiration and revoke/regenerate flow
- Category management per space (create, update, delete)
- Expense/income movements with filters:
	- year/month
	- YTD
	- category
	- description search
	- tag filter
- Responsive UI with mobile bottom navigation
- Role-aware admin area (admin role required)

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project with the required tables and policies

## Environment Variables

Create a `.env` file in the project root with:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Notes:

- `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are used by browser and server clients.
- `SUPABASE_SERVICE_ROLE_KEY` is used only on the server for admin operations.
- Never expose the service role key in client-side code.

## Getting started

```sh
npm install
npm run dev      # dev server (host mode: vite dev --host)
```

Other commands:

```sh
npm run build        # production build
npm run preview      # preview production build
npm run check        # type-check with svelte-check
npm run check:watch  # type-check in watch mode
```

## Supabase Setup

Use SQL and data files in `docs/` to bootstrap your database:

- `docs/query-creazione-db.sql`
- `docs/migrations/*.csv`

Recommended flow:

1. Create a new Supabase project.
2. Run SQL schema from `docs/query-creazione-db.sql`.
3. Import seed CSV files if needed.
4. Configure authentication providers (email/password and optionally Google).
5. Add environment variables to `.env`.

## Authentication and Authorization

- Session is resolved server-side in `src/hooks.server.ts`.
- Current user and role are loaded in `src/routes/+layout.server.ts`.
- Admin access checks use `user_roles` and redirect non-admin users.
- Invite links are validated server-side before adding a user to a space.

## Project Structure

```txt
src/
	lib/
		components/        # reusable Svelte components
		server/            # server utilities (auth/admin client)
		supabaseClient.ts  # browser supabase client
	routes/
		+layout.*          # app shell, navbar, bottom nav, auth context
		+page.*            # home dashboard and movements
		login/             # login page and actions
		spaces/            # spaces list and create/set-active actions
		spaces/[id]/       # space settings, categories, members, invites
		spaces/join/[token]/ # invite join flow
		admin/             # admin-only section
```

## Deployment Notes

- Project currently uses `@sveltejs/adapter-auto`.
- For production, configure the adapter based on your target platform.
- Ensure server environment variables are configured in your hosting provider.

## Status

Core expense tracking flows are implemented and usable.
The admin area is currently a protected placeholder for future management tools.
