/**
 * Shared URL-filter parsing utilities used by the home and statistics page
 * load functions. Centralises the duplicated year/month/ytd/type/tag logic.
 */

export const VALID_TYPES = ['needs', 'wants', 'income', 'savings'] as const;
export type CategoryType = (typeof VALID_TYPES)[number];

export interface ParsedFilters {
	year: number | null;
	month: number | null;
	ytd: boolean;
	/** Empty array means "no category filter" (show all). */
	categoryIds: string[];
	type: CategoryType | null;
	query: string;
	tag: string | null;
}

interface ParseFilterOptions {
	/** Required unless `optimistic` is set. */
	availableYears?: number[];
	/**
	 * When true, skip validation against availableYears: assume the current
	 * year has data and accept any plausible explicit year param. Lets callers
	 * start the movements query in parallel with the bootstrap query, then
	 * re-parse with real availableYears and correct only if the result differs.
	 */
	optimistic?: boolean;
	/**
	 * When true (statistics page), ytd defaults to true if neither year nor
	 * month params are present.
	 */
	defaultYtd?: boolean;
	/**
	 * When true (home page), month defaults to the current month when neither
	 * year nor month params are present and a year was resolved.
	 */
	defaultToCurrentPeriod?: boolean;
	/**
	 * When true (statistics page), fall back to the first available year if the
	 * current year has no data.
	 */
	fallbackToFirstAvailableYear?: boolean;
}

export function parseUrlFilters(url: URL, options: ParseFilterOptions): ParsedFilters {
	const {
		availableYears = [],
		optimistic = false,
		defaultYtd = false,
		defaultToCurrentPeriod = false,
		fallbackToFirstAvailableYear = false
	} = options;

	const yearRaw = url.searchParams.get('year')?.trim() ?? '';
	const monthRaw = url.searchParams.get('month')?.trim() ?? '';
	const hasYearParam = url.searchParams.has('year');
	const hasMonthParam = url.searchParams.has('month');

	const today = new Date();
	const currentYear = today.getUTCFullYear();
	const currentMonth = today.getUTCMonth() + 1;

	const ytd = monthRaw === 'ytd' || (defaultYtd && !hasYearParam && !hasMonthParam);

	// Allow multiple `category` params; validate each to a reasonable length.
	const categoryIds = url.searchParams
		.getAll('category')
		.map((id) => id.trim())
		.filter((id) => id.length > 0 && id.length <= 36);
	const query = (url.searchParams.get('q')?.trim().toLowerCase() ?? '').slice(0, 100);
	const tag = (url.searchParams.get('tag')?.trim() ?? '').slice(0, 40) || null;

	const typeRaw = url.searchParams.get('type')?.trim().toLowerCase() ?? '';
	const type: CategoryType | null = (VALID_TYPES as readonly string[]).includes(typeRaw)
		? (typeRaw as CategoryType)
		: null;

	const parsedYear = Number.parseInt(yearRaw, 10);
	const parsedMonth = Number.parseInt(monthRaw, 10);

	let year =
		Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
			? parsedYear
			: null;

	// Year defaults when no explicit year param
	if (!hasYearParam) {
		if (optimistic || availableYears.includes(currentYear)) {
			year = currentYear;
		} else if (fallbackToFirstAvailableYear) {
			year = availableYears[0] ?? null;
		}
	}
	if (!optimistic && year && !availableYears.includes(year)) year = null;

	const parsedMonthNum =
		!ytd && Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
			? parsedMonth
			: null;

	let month: number | null;
	if (ytd || !year) {
		month = null;
	} else if (!hasYearParam && !hasMonthParam && defaultToCurrentPeriod) {
		// Home page default: when arriving with no params, show the current month
		month = currentMonth;
	} else {
		month = parsedMonthNum;
	}

	return { year, month, ytd, categoryIds, type, query, tag };
}

export function buildDateRange(
	year: number | null,
	month: number | null,
	ytd: boolean,
	currentYear: number,
	todayIso: string
): { fromDate: string | null; toDate: string | null } {
	if (ytd) {
		const ytdYear = year ?? currentYear;
		return {
			fromDate: `${ytdYear}-01-01`,
			toDate: ytdYear === currentYear ? todayIso : `${ytdYear}-12-31`
		};
	}
	if (year && month) {
		const monthPadded = String(month).padStart(2, '0');
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		return {
			fromDate: `${year}-${monthPadded}-01`,
			toDate: `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`
		};
	}
	if (year) {
		return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
	}
	return { fromDate: null, toDate: null };
}
