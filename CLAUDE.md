# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | SvelteKit | 2.x |
| UI | Svelte 5 (runes — `$state`, `$derived`, `$effect`) | 5.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS (utility-first, no component library) | 4.x |
| Auth + DB | Supabase (email/password + Google OAuth, Postgres) | — |
| Other | lucide-svelte icons, Chart.js, Vercel Analytics | — |

## Commands

```sh
npm run dev          # start dev server (host mode)
npm run build        # production build
npm run check        # type-check with svelte-check
npm run check:watch  # type-check in watch mode
```

There is no test suite and no lint script beyond `svelte-check`.

## Architecture

### Two Supabase clients

- **Browser client** — `src/lib/supabaseClient.ts`, uses the publishable key, safe for client-side use.
- **Server client** — created per-request in `src/hooks.server.ts` via `@supabase/ssr`, attached to `event.locals.supabase`.
- **Admin client** — lazy singleton in `src/lib/server/auth.ts`, uses the service role key, bypasses RLS. Required for writes that cross user boundaries (notifications, movement inserts, invite validation).

### Request lifecycle

1. `src/hooks.server.ts` — wires up the per-request Supabase client and a `safeGetSession()` helper that calls `auth.getUser()` once per request and caches the result in `locals._sessionCache`.
2. `src/routes/+layout.server.ts` — runs on every navigation; fetches user role and the last 20 notifications in parallel and forwards them to all pages.
3. Page load functions call `withCache()` from `src/lib/server/movements.ts` for the `v_space_home_bootstrap` Postgres view, which collapses space metadata + categories + members + movement date range into one query. TTL is 60 s in-process. The homepage and statistics page share the same cache key (`home-bootstrap:{userId}:{spaceId}`), so navigating between them doesn't re-fetch.

### Active space

The currently selected space ID is stored in `user.user_metadata.active_space_id` (Supabase user metadata). Every load function reads this to scope all queries.

### Category types and amount sign

Categories have a `type` field: `needs | wants | income | savings`. When a movement is created or updated, `resolveCategorySign()` (`src/lib/server/movements.ts`) applies `+1` for income and `-1` for all expense types. The `invert_sign` form field allows overriding the sign (used for refunds/corrections).

### Recurring movements

Checking the "recurring" checkbox in the movement form inserts one row per remaining month in the selected year (from the chosen month through December), each tagged with `'recurring'`.

### Notifications

After a movement is created, `dispatchCreationNotifications()` inserts notification rows for all other space members. This is fire-and-forget (`try/catch` with no re-throw) and never blocks the response.

### Statistics aggregation

The statistics page (`src/routes/statistics/+page.server.ts`) fetches raw movements server-side, aggregates them into totals, per-category totals, and a monthly trend series, and sends only the aggregated data to the browser — no raw rows are serialised.

### Filter parsing

`src/lib/server/filters.ts` provides `parseUrlFilters()` and `buildDateRange()`, shared by both the home page and statistics page. Filters are URL-driven: `year`, `month` (or `ytd`), `category` (multi-value), `type`, `q`, `tag`.

## Environment variables

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_PUBLISHABLE_KEY   # safe for browser
SUPABASE_SERVICE_ROLE_KEY         # server only, never expose to client
```

## Database

Schema SQL is in `docs/query-creazione-db.sql`. The key Postgres view is `v_space_home_bootstrap`, which the load functions query to bootstrap the home and statistics pages. Tables follow the `costs_` prefix convention (`costs_movements`, `costs_categories`, `costs_spaces`, `costs_spaces_connections`, `costs_notifications`, `user_roles`).
