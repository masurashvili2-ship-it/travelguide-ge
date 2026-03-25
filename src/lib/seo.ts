/** Strip Markdown to plain text for meta descriptions (best-effort). */
export function stripMarkdownForMeta(md: string, maxLen = 400): string {
	let s = md
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (s.length <= maxLen) return s;
	return `${s.slice(0, maxLen - 1).trimEnd()}…`;
}

export function truncateMeta(s: string, maxLen = 158): string {
	const t = s.trim();
	if (t.length <= maxLen) return t;
	return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Order: custom SEO field → excerpt → generated from body */
export function resolveTourMetaDescription(
	custom: string | null | undefined,
	excerpt: string,
	body: string,
): string {
	const c = custom?.trim();
	if (c) return truncateMeta(c);
	const e = excerpt.trim();
	if (e) return truncateMeta(e);
	return truncateMeta(stripMarkdownForMeta(body || ''));
}

export function absoluteSeoUrl(href: string | null | undefined, site: URL | undefined): string | undefined {
	if (!href?.trim()) return undefined;
	const u = href.trim();
	if (/^https?:\/\//i.test(u)) return u;
	if (!site) return u;
	const path = u.startsWith('/') ? u : `/${u}`;
	return new URL(path, site).href;
}

export function buildTourJsonLd(input: {
	title: string;
	description: string;
	pageUrl: string;
	siteOrigin: string;
	imageUrl?: string;
	locale: string;
	priceText: string | null;
	updatedAt: number;
}): Record<string, unknown> {
	const obj: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'TouristTrip',
		name: input.title,
		description: input.description,
		url: input.pageUrl,
		inLanguage: input.locale,
		dateModified: new Date(input.updatedAt).toISOString(),
		provider: {
			'@type': 'Organization',
			name: 'Travel Guide Georgia',
			url: input.siteOrigin.replace(/\/$/, '') || input.pageUrl,
		},
	};
	if (input.imageUrl) obj.image = input.imageUrl;
	if (input.priceText?.trim()) {
		obj.offers = {
			'@type': 'Offer',
			description: input.priceText.trim(),
			priceCurrency: 'GEL',
		};
	}
	return obj;
}
