import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { getAdminClient } from '$lib/server/auth';

const MAX_EXPORT = 5000;
const VALID_TYPES = ['needs', 'wants', 'income', 'savings'] as const;

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const activeSpaceId = (user.user_metadata?.active_space_id as string | undefined) ?? null;
	if (!activeSpaceId) return new Response('No active space', { status: 400 });

	// Verify space access
	const { data: conn } = await locals.supabase
		.from('costs_spaces_connections')
		.select('space_id')
		.eq('space_id', activeSpaceId)
		.eq('user_id', user.id)
		.maybeSingle();
	if (!conn) return new Response('Forbidden', { status: 403 });

	// Parse filters (mirrors +page.server.ts logic)
	const yearRaw = url.searchParams.get('year')?.trim() ?? '';
	const monthRaw = url.searchParams.get('month')?.trim() ?? '';
	const ytd = monthRaw === 'ytd';
	const categoryId = url.searchParams.get('category')?.trim() || null;
	const query = (url.searchParams.get('q')?.trim().toLowerCase() ?? '').slice(0, 100);
	const tag = (url.searchParams.get('tag')?.trim() ?? '').slice(0, 40) || null;
	const typeRaw = url.searchParams.get('type')?.trim().toLowerCase() ?? '';
	const type = (VALID_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : null;

	const parsedYear = Number.parseInt(yearRaw, 10);
	const parsedMonth = Number.parseInt(monthRaw, 10);
	const year =
		Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : null;
	const month =
		ytd || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12
			? null
			: parsedMonth;

	const today = new Date();
	const todayIso = today.toISOString().slice(0, 10);
	const currentYear = today.getUTCFullYear();

	let fromDate: string | null = null;
	let toDate: string | null = null;

	if (ytd) {
		const ytdYear = year ?? currentYear;
		fromDate = `${ytdYear}-01-01`;
		toDate = ytdYear === currentYear ? todayIso : `${ytdYear}-12-31`;
	} else if (year && month) {
		const monthPadded = String(month).padStart(2, '0');
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		fromDate = `${year}-${monthPadded}-01`;
		toDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
	} else if (year) {
		fromDate = `${year}-01-01`;
		toDate = `${year}-12-31`;
	}

	const admin = getAdminClient();
	if (!admin) return new Response('Service unavailable', { status: 500 });

	const categoryRelation = type ? 'costs_categories!inner' : 'costs_categories';

	let q = admin
		.from('costs_movements')
		.select(
			`id, amount, date, description, expense_user_id, tags, ${categoryRelation}(id, name, type)`
		)
		.eq('space_id', activeSpaceId)
		.order('date', { ascending: false })
		.range(0, MAX_EXPORT - 1);

	if (fromDate) q = q.gte('date', fromDate);
	if (toDate) q = q.lte('date', toDate);
	if (categoryId) q = q.eq('category_id', categoryId);
	if (type) q = q.eq('costs_categories.type', type);
	if (query) q = q.ilike('description', `%${query}%`);
	if (tag) q = q.contains('tags', [tag]);

	const { data: movements, error } = await q;
	if (error || !movements) return new Response('Failed to fetch data', { status: 500 });

	// Fetch space format for locale
	const { data: space } = await locals.supabase
		.from('costs_spaces')
		.select('format')
		.eq('id', activeSpaceId)
		.single();

	const locale = space?.format === 'EN' ? 'en-US' : 'it-IT';
	const decimalSep = locale === 'en-US' ? '.' : ',';
	const fieldSep = locale === 'en-US' ? ',' : ';';

	function escapeField(value: string): string {
		if (value.includes(fieldSep) || value.includes('"') || value.includes('\n')) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	const header = ['Date', 'Amount', 'Category', 'Type', 'Description', 'Tags'].join(fieldSep);

	const rows = (movements as unknown as Array<{
		amount: number;
		date: string;
		description: string | null;
		expense_user_id: string | null;
		tags: string[] | null;
		costs_categories: { name: string; type: string } | null;
	}>).map((m) => {
		const cat = m.costs_categories;
		const amount = typeof m.amount === 'number' ? Math.abs(m.amount).toFixed(2).replace('.', decimalSep) : '';
		const sign = typeof m.amount === 'number' ? (m.amount >= 0 ? '+' : '-') : '';
		const tags = m.tags ? m.tags.join(' | ') : '';
		return [
			m.date,
			sign + amount,
			escapeField(cat?.name ?? ''),
			cat?.type ?? '',
			escapeField(m.description ?? ''),
			escapeField(tags)
		].join(fieldSep);
	});

	const csv = '\uFEFF' + [header, ...rows].join('\r\n'); // BOM for Excel UTF-8
	const filename = `export-${new Date().toISOString().slice(0, 10)}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
