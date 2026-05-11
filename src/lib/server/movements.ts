import type { SupabaseClient } from '@supabase/supabase-js';

const YEARS_SCAN_PAGE_SIZE = 1000;
const YEARS_SCAN_MAX_ROWS = 10000;

/**
 * Scans all movement dates for a given space and returns a sorted list of
 * distinct years (descending) present in the data.
 */
export async function scanAvailableYears(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	client: SupabaseClient<any>,
	spaceId: string
): Promise<number[]> {
	const yearSet = new Set<number>();
	let scannedRows = 0;
	let from = 0;

	while (scannedRows < YEARS_SCAN_MAX_ROWS) {
		const to = from + YEARS_SCAN_PAGE_SIZE - 1;
		const { data: dateRows } = await client
			.from('costs_movements')
			.select('date')
			.eq('space_id', spaceId)
			.order('date', { ascending: false })
			.range(from, to);

		if (!dateRows || dateRows.length === 0) break;

		for (const row of dateRows as Array<{ date: string | null }>) {
			if (!row.date) continue;
			const y = Number.parseInt(row.date.slice(0, 4), 10);
			if (Number.isInteger(y)) yearSet.add(y);
		}

		scannedRows += dateRows.length;
		if (dateRows.length < YEARS_SCAN_PAGE_SIZE) break;
		from += YEARS_SCAN_PAGE_SIZE;
	}

	return Array.from(yearSet).sort((a, b) => b - a);
}
