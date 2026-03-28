import { getPagePosts } from './pages-db';
import { listRegionIndexCards } from './regions-db';
import type { Locale } from './strings';
import { isLocale } from './tours-db';
import { listAllPublishedPackages } from './guide-packages-db';
import { listWhatToDoForLocale } from './tours-db';
import { listGuidesForLocale } from './guides-db';

export type SiteSearchResultKind = 'tour' | 'what-to-do' | 'region' | 'page' | 'guide';

export type SiteSearchResult = {
	kind: SiteSearchResultKind;
	/** Path after locale for `getRelativeLocaleUrl(locale, path)` */
	path: string;
	title: string;
	snippet: string;
	score: number;
};

function stripMarkdownish(s: string): string {
	return s
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^\s*#{1,6}\s+/gm, '')
		.replace(/[*_~>]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokenize(query: string): string[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const parts = q.split(/[\s,.;:!?]+/).filter((t) => t.length > 0);
	return [...new Set(parts)];
}

function countOccurrences(haystack: string, needle: string): number {
	if (!needle) return 0;
	const h = haystack.toLowerCase();
	const n = needle.toLowerCase();
	let c = 0;
	let i = 0;
	while ((i = h.indexOf(n, i)) !== -1) {
		c++;
		i += n.length;
	}
	return c;
}

function makeSnippet(source: string, terms: string[], maxLen = 200): string {
	const plain = stripMarkdownish(source);
	const lower = plain.toLowerCase();
	for (const t of terms) {
		if (!t) continue;
		const idx = lower.indexOf(t);
		if (idx >= 0) {
			const start = Math.max(0, idx - 70);
			const slice = plain.slice(start, start + maxLen).trim();
			return (start > 0 ? '…' : '') + slice + (start + maxLen < plain.length ? '…' : '');
		}
	}
	const s = plain.slice(0, maxLen).trim();
	return s + (plain.length > maxLen ? '…' : '');
}

function scoreAgainst(terms: string[], parts: { text: string; weight: number }[]): number {
	let total = 0;
	for (const { text, weight } of parts) {
		const t = text.toLowerCase();
		for (const term of terms) {
			if (!term) continue;
			const n = countOccurrences(t, term);
			if (n > 0) total += weight * Math.min(n, 8);
		}
	}
	return total;
}

/**
 * Full-text style search across tours, what-to-do, regions, and static pages for one locale.
 */
export function searchSite(locale: Locale, query: string): SiteSearchResult[] {
	if (!isLocale(locale)) return [];
	const terms = tokenize(query);
	if (terms.length === 0) return [];

	const out: SiteSearchResult[] = [];

	for (const pkg of listAllPublishedPackages()) {
		const block = pkg.i18n[locale] ?? pkg.i18n['en'] ?? pkg.i18n['ka'] ?? pkg.i18n['ru'];
		if (!block?.title?.trim()) continue;
		const title = block.title.trim();
		const desc = block.description ?? '';
		const body = block.body ?? '';
		const slug = pkg.slug;
		const includes = block.includes_text ?? '';
		const meeting = block.meeting_point_text ?? '';
		const score = scoreAgainst(terms, [
			{ text: title, weight: 12 },
			{ text: slug, weight: 10 },
			{ text: desc, weight: 6 },
			{ text: body, weight: 2 },
			{ text: includes, weight: 3 },
			{ text: meeting, weight: 2 },
		]);
		if (score <= 0) continue;
		out.push({
			kind: 'tour',
			path: `tours/${slug}`,
			title,
			snippet: makeSnippet(desc || title, terms),
			score,
		});
	}

	for (const item of listWhatToDoForLocale(locale)) {
		const title = item.data.title ?? '';
		const excerpt = item.data.excerpt ?? '';
		const body = item.body ?? '';
		const slug = item.data.slug ?? '';
		const score = scoreAgainst(terms, [
			{ text: title, weight: 12 },
			{ text: slug, weight: 10 },
			{ text: excerpt, weight: 7 },
			{ text: body, weight: 2 },
		]);
		if (score <= 0) continue;
		out.push({
			kind: 'what-to-do',
			path: `what-to-do/${item.data.slug}`,
			title: title || slug,
			snippet: makeSnippet(excerpt || body || title, terms),
			score,
		});
	}

	for (const guide of listGuidesForLocale(locale)) {
		const name = guide.name ?? '';
		const tagline = guide.tagline ?? '';
		const slug = guide.slug ?? '';
		const score = scoreAgainst(terms, [
			{ text: name, weight: 14 },
			{ text: slug, weight: 10 },
			{ text: tagline, weight: 7 },
			{ text: guide.base_location ?? '', weight: 4 },
		]);
		if (score <= 0) continue;
		out.push({
			kind: 'guide',
			path: `guides/${slug}`,
			title: name || slug,
			snippet: makeSnippet(tagline || name, terms),
			score,
		});
	}

	for (const card of listRegionIndexCards(locale)) {
		const title = card.title;
		const excerpt = card.excerpt ?? '';
		const subtitle = card.subtitle ?? '';
		const slug = card.slug;
		const score = scoreAgainst(terms, [
			{ text: title, weight: 12 },
			{ text: slug, weight: 9 },
			{ text: subtitle, weight: 6 },
			{ text: excerpt, weight: 5 },
		]);
		if (score <= 0) continue;
		out.push({
			kind: 'region',
			path: `regions/${card.slug}`,
			title,
			snippet: makeSnippet(excerpt || subtitle || title, terms),
			score,
		});
	}

	for (const post of getPagePosts()) {
		const block = post.i18n[locale];
		if (!block?.title?.trim()) continue;
		const title = block.title.trim();
		const body = block.body ?? '';
		const slug = post.slug;
		const seo = `${block.seo_title ?? ''} ${block.seo_description ?? ''}`;
		const score = scoreAgainst(terms, [
			{ text: title, weight: 12 },
			{ text: slug, weight: 10 },
			{ text: seo, weight: 5 },
			{ text: body, weight: 2 },
		]);
		if (score <= 0) continue;
		out.push({
			kind: 'page',
			path: post.slug,
			title,
			snippet: makeSnippet(block.seo_description || excerptFromBody(body) || title, terms),
			score,
		});
	}

	out.sort((a, b) => b.score - a.score);
	return out.slice(0, 80);
}

function excerptFromBody(body: string): string {
	const t = stripMarkdownish(body).trim();
	return t.slice(0, 280);
}
