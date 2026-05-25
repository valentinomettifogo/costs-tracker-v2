import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CatEntry = { id: string; name: string; type: string; space_id: string };

/**
 * Converts a min/max date string pair (YYYY-MM-DD) from the bootstrap view
 * into a descending list of years for the filter UI.
 */
export function buildAvailableYearsFromRange(
	oldestDate: string | null,
	newestDate: string | null
): number[] {
	if (!oldestDate || !newestDate) return [];
	const minYear = Number.parseInt(oldestDate.slice(0, 4), 10);
	const maxYear = Number.parseInt(newestDate.slice(0, 4), 10);
	if (!Number.isInteger(minYear) || !Number.isInteger(maxYear) || minYear > maxYear) return [];
	const years: number[] = [];
	for (let y = maxYear; y >= minYear; y--) years.push(y);
	return years;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Module-level Map persists across requests in the same server process,
// eliminating redundant Supabase roundtrips on every filter change.
interface CacheEntry<T> { data: T; expiresAt: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _cache = new Map<string, CacheEntry<any>>();

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const entry = _cache.get(key) as CacheEntry<T> | undefined;
	if (entry && entry.expiresAt > now) return entry.data;
	const data = await fn();
	_cache.set(key, { data, expiresAt: now + ttlMs });
	return data;
}

/**
 * Resolves the sign multiplier (+1 or -1) and display name for a category.
 * Uses the shared in-memory cache so that actions on the same server process
 * avoid an extra Supabase round-trip when the cache is warm from the page load.
 */
export async function resolveCategorySign(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	client: SupabaseClient<any>,
	spaceId: string,
	categoryId: string | null
): Promise<{ sign: number; categoryName: string | null }> {
	if (!categoryId) return { sign: -1, categoryName: null };

	const categories = await withCache<CatEntry[]>(
		`home-categories:${spaceId}`,
		60_000,
		async () => {
			const { data } = await client
				.from('costs_categories')
				.select('id, name, type, space_id')
				.eq('space_id', spaceId)
				.order('name');
			return (data as CatEntry[]) ?? [];
		}
	);

	const cat = categories.find((c) => c.id === categoryId);
	return {
		sign: cat?.type === 'income' ? 1 : -1,
		categoryName: cat?.name ?? null
	};
}
