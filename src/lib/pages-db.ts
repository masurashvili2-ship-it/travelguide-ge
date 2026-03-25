import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from './strings';
import { isValidSlug } from './tours-db';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'pages.json');

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

/** URL segments reserved by the app (cannot be used as page slugs). */
export const RESERVED_PAGE_SLUGS = new Set(
	['admin', 'tours', 'login', 'register', 'api', 'p', 'pages'].map((s) => s.toLowerCase()),
);

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidPageId(id: string): boolean {
	return UUID_RE.test(id);
}

export type PageLocaleBlock = {
	title: string;
	body: string;
	seo_title: string | null;
	seo_description: string | null;
};

export type PagePost = {
	id: string;
	slug: string;
	/** Sort order in the admin Pages list only. */
	sort_order: number;
	updated_at: number;
	i18n: Partial<Record<Locale, PageLocaleBlock>>;
};

export type PageRow = PagePost & {
	locale: Locale;
};

let cachedPosts: PagePost[] | null = null;
let cachedPagesMtimeMs = 0;

function pagesFileMtimeMs(): number {
	if (!existsSync(STORE_FILE)) return 0;
	try {
		return statSync(STORE_FILE).mtimeMs;
	} catch {
		return 0;
	}
}

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeLocaleBlock(raw: unknown): PageLocaleBlock | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const title = String(o.title ?? '').trim();
	if (!title) return null;
	const st = o.seo_title;
	const sd = o.seo_description;
	return {
		title,
		body: String(o.body ?? ''),
		seo_title: st == null || st === '' ? null : String(st),
		seo_description: sd == null || sd === '' ? null : String(sd),
	};
}

function normalizePost(raw: unknown): PagePost | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' ? o.id : '';
	const slug = typeof o.slug === 'string' ? o.slug.trim().toLowerCase() : '';
	if (!isValidPageId(id) || !slug) return null;
	const i18nRaw = o.i18n;
	const i18n: Partial<Record<Locale, PageLocaleBlock>> = {};
	if (i18nRaw && typeof i18nRaw === 'object') {
		for (const loc of LOCALES) {
			const b = normalizeLocaleBlock((i18nRaw as Record<string, unknown>)[loc]);
			if (b) i18n[loc] = b;
		}
	}
	const so = o.sort_order;
	return {
		id,
		slug,
		sort_order: typeof so === 'number' && Number.isFinite(so) ? so : 0,
		updated_at: typeof o.updated_at === 'number' ? o.updated_at : Date.now(),
		i18n,
	};
}

function readStore(): PagePost[] {
	if (!existsSync(STORE_FILE)) {
		return [];
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Record<string, unknown>;
		const arr = raw.posts;
		if (!Array.isArray(arr)) return [];
		const out: PagePost[] = [];
		for (const item of arr) {
			const p = normalizePost(item);
			if (p) out.push(p);
		}
		return out;
	} catch {
		return [];
	}
}

function toCleanPost(p: PagePost): PagePost {
	return {
		id: p.id,
		slug: p.slug,
		sort_order: p.sort_order,
		updated_at: p.updated_at,
		i18n: p.i18n,
	};
}

function writeStore(posts: PagePost[]) {
	ensureDataDir();
	writeFileSync(STORE_FILE, JSON.stringify({ posts: posts.map(toCleanPost) }, null, 2), 'utf8');
	cachedPosts = [...posts];
	try {
		cachedPagesMtimeMs = statSync(STORE_FILE).mtimeMs;
	} catch {
		cachedPagesMtimeMs = Date.now();
	}
}

export function getPagePosts(): PagePost[] {
	if (!existsSync(STORE_FILE)) {
		cachedPosts = [];
		cachedPagesMtimeMs = 0;
		return cachedPosts;
	}
	const mtime = pagesFileMtimeMs();
	if (cachedPosts === null || mtime > cachedPagesMtimeMs) {
		cachedPosts = readStore();
		cachedPagesMtimeMs = mtime;
	}
	return cachedPosts;
}

export function getPagePostBySlug(slug: string): PagePost | null {
	const s = slug.trim().toLowerCase();
	return getPagePosts().find((p) => p.slug === s) ?? null;
}

export function getPagePostById(id: string): PagePost | null {
	if (!isValidPageId(id)) return null;
	return getPagePosts().find((p) => p.id === id) ?? null;
}

/** Row for one locale, or null if that language is not filled in. */
export function getPageRowForLocale(slug: string, locale: Locale): PageRow | null {
	const post = getPagePostBySlug(slug);
	if (!post) return null;
	const block = post.i18n[locale];
	if (!block) return null;
	return { ...post, locale, i18n: { [locale]: block } };
}

export type AdminPageListItem = {
	id: string;
	slug: string;
	sort_order: number;
	titles: Record<Locale, string>;
	locales: Locale[];
};

export function listAllPagesAdmin(): AdminPageListItem[] {
	return [...getPagePosts()]
		.sort((a, b) => {
			if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
			return a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' });
		})
		.map((p) => {
			const titles = {
				en: p.i18n.en?.title ?? '',
				ka: p.i18n.ka?.title ?? '',
				ru: p.i18n.ru?.title ?? '',
			};
			const locales = LOCALES.filter((l) => !!p.i18n[l]?.title);
			return {
				id: p.id,
				slug: p.slug,
				sort_order: p.sort_order,
				titles,
				locales,
			};
		});
}

export type SavePagePostInput = {
	id?: string;
	slug: string;
	sort_order: number;
	i18n: Partial<Record<Locale, PageLocaleBlock>>;
	mode: 'create' | 'update';
};

export function savePagePost(
	input: SavePagePostInput,
): { ok: true } | { ok: false; error: string } {
	const { id, slug: rawSlug, sort_order, i18n, mode } = input;
	const slug = rawSlug.trim().toLowerCase();

	if (!isValidSlug(slug)) {
		return { ok: false, error: 'Invalid slug (use lowercase letters, numbers, hyphens)' };
	}
	if (RESERVED_PAGE_SLUGS.has(slug)) {
		return { ok: false, error: 'This slug is reserved for the site (e.g. tours, login)' };
	}

	const filledLocales = LOCALES.filter((l) => {
		const b = i18n[l];
		return !!(b?.title?.trim());
	});
	if (filledLocales.length === 0) {
		return { ok: false, error: 'Add at least one language with a title' };
	}

	for (const loc of LOCALES) {
		const b = i18n[loc];
		if (!b) continue;
		const t = b.title?.trim() ?? '';
		const body = b.body ?? '';
		const hasSeo = !!(b.seo_title?.trim() || b.seo_description?.trim());
		if (!t && (body.trim() || hasSeo)) {
			return {
				ok: false,
				error: `Incomplete ${loc}: add a title or clear body and SEO fields for that language`,
			};
		}
	}

	const cleanI18n: Partial<Record<Locale, PageLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const b = i18n[loc];
		if (!b) continue;
		const t = b.title.trim();
		if (!t) continue;
		const st = b.seo_title?.trim();
		const sd = b.seo_description?.trim();
		cleanI18n[loc] = {
			title: t,
			body: (b.body ?? '').trim(),
			seo_title: st ? st : null,
			seo_description: sd ? sd : null,
		};
	}

	const now = Date.now();
	const posts = [...getPagePosts()];

	if (mode === 'create') {
		if (posts.some((p) => p.slug === slug)) {
			return { ok: false, error: 'A page with this slug already exists' };
		}
		posts.push({
			id: randomUUID(),
			slug,
			sort_order,
			i18n: cleanI18n,
			updated_at: now,
		});
		writeStore(posts);
		return { ok: true };
	}

	if (!id || !isValidPageId(id)) {
		return { ok: false, error: 'Missing or invalid page id' };
	}

	const idx = posts.findIndex((p) => p.id === id);
	if (idx === -1) {
		return { ok: false, error: 'Page not found' };
	}

	const clash = posts.some((p) => p.slug === slug && p.id !== id);
	if (clash) {
		return { ok: false, error: 'Another page already uses this slug' };
	}

	const prev = posts[idx];
	posts[idx] = {
		...prev,
		slug,
		sort_order,
		i18n: cleanI18n,
		updated_at: now,
	};
	writeStore(posts);
	return { ok: true };
}
