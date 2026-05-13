import type { SupabaseClient } from '@supabase/supabase-js';

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
