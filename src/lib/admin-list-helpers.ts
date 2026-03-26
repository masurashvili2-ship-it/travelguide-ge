import type { AdminRegionListItem } from './regions-db';
import { contributorAuthorEmailForPublishedPost } from './submissions-db';
import type { AdminTourListItem } from './tours-db';

export const ADMIN_LIST_PAGE_SIZE = 25;

export function parseAdminListPage(sp: URLSearchParams, key = 'page'): number {
	const raw = sp.get(key);
	const n = raw ? parseInt(raw, 10) : 1;
	if (!Number.isFinite(n) || n < 1) return 1;
	return n;
}

export function paginateSlice<T>(
	items: T[],
	page: number,
	pageSize: number,
): { slice: T[]; page: number; totalPages: number; total: number } {
	const total = items.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
	const pageClamped = Math.min(Math.max(1, page), totalPages);
	const start = (pageClamped - 1) * pageSize;
	return {
		slice: items.slice(start, start + pageSize),
		page: pageClamped,
		totalPages,
		total,
	};
}

/** Merge query updates into the current path + search string (pathname must include leading slash). */
export function buildAdminQueryLink(
	pathname: string,
	currentSearch: string,
	updates: Record<string, string | null | undefined>,
): string {
	const base = pathname + (currentSearch || '');
	const u = new URL(base, 'http://localhost');
	for (const [key, val] of Object.entries(updates)) {
		if (val === null || val === undefined || val === '') u.searchParams.delete(key);
		else u.searchParams.set(key, val);
	}
	return u.pathname + u.search;
}

export function filterTourRowsForAdmin(
	rows: AdminTourListItem[],
	q: string,
	kind: 'tours' | 'what-to-do',
): AdminTourListItem[] {
	const n = q.trim().toLowerCase();
	if (!n) return rows;
	const terms = n.split(/\s+/).filter(Boolean);
	return rows.filter((row) => {
		const author =
			row.author_email?.trim() || contributorAuthorEmailForPublishedPost(kind, row.id) || '';
		const hay = [row.slug, row.titles.en, row.titles.ka, row.titles.ru, author]
			.join(' ')
			.toLowerCase();
		return terms.every((t) => hay.includes(t));
	});
}

export function filterRegionRowsForAdmin(rows: AdminRegionListItem[], q: string): AdminRegionListItem[] {
	const n = q.trim().toLowerCase();
	if (!n) return rows;
	const terms = n.split(/\s+/).filter(Boolean);
	return rows.filter((row) => {
		const hay = [row.slug, row.level, row.titles.en, row.titles.ka, row.titles.ru]
			.join(' ')
			.toLowerCase();
		return terms.every((t) => hay.includes(t));
	});
}

export function listRangeLabel(
	page: number,
	pageSize: number,
	total: number,
	nounPlural = 'posts',
): string {
	if (total === 0) return `0 ${nounPlural}`;
	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, total);
	return `${start}–${end} of ${total}`;
}
