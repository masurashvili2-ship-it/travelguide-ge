/**
 * GET ?q=…&locale=en — suggest site pages to link from tour itinerary text (signed-in users).
 */
import type { APIRoute } from 'astro';
import { searchSite } from '../../../lib/site-search';
import type { Locale } from '../../../lib/strings';

const KINDS = new Set(['what-to-do', 'region', 'guide', 'page']);

function isLocale(s: string): s is Locale {
	return s === 'en' || s === 'ka' || s === 'ru';
}

export const GET: APIRoute = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const u = new URL(url);
	const q = u.searchParams.get('q')?.trim() ?? '';
	const locParam = u.searchParams.get('locale') ?? 'en';
	const locale = isLocale(locParam) ? locParam : 'en';

	if (q.length < 2) {
		return new Response(JSON.stringify({ suggestions: [] }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const all = searchSite(locale, q);
	const suggestions = all
		.filter((r) => KINDS.has(r.kind))
		.slice(0, 14)
		.map((r) => ({ kind: r.kind, path: r.path, title: r.title }));

	return new Response(JSON.stringify({ suggestions, locale }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
