import type { SupabaseClient } from '@supabase/supabase-js';

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
 * Returns a sorted list of distinct years (descending) present in the space's
 * movements. Uses 2 parallel queries on the min/max dates instead of paginating
 * every row – reduces DB roundtrips from O(N/1000) to exactly 2.
 *
 * Note: years with no data that fall within the min–max range are included
 * (e.g. gap years). This is intentional and acceptable for the filter UI.
 */
export async function scanAvailableYears(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	client: SupabaseClient<any>,
	spaceId: string
): Promise<number[]> {
	const [{ data: newest }, { data: oldest }] = await Promise.all([
		client
			.from('costs_movements')
			.select('date')
			.eq('space_id', spaceId)
			.order('date', { ascending: false })
			.limit(1),
		client
			.from('costs_movements')
			.select('date')
			.eq('space_id', spaceId)
			.order('date', { ascending: true })
			.limit(1)
	]);

	const newestDate = (newest as Array<{ date: string | null }>)?.[0]?.date;
	const oldestDate = (oldest as Array<{ date: string | null }>)?.[0]?.date;
	if (!newestDate || !oldestDate) return [];

	const maxYear = Number.parseInt(newestDate.slice(0, 4), 10);
	const minYear = Number.parseInt(oldestDate.slice(0, 4), 10);
	if (!Number.isInteger(maxYear) || !Number.isInteger(minYear)) return [];

	const years: number[] = [];
	for (let y = maxYear; y >= minYear; y--) years.push(y);
	return years;
}
