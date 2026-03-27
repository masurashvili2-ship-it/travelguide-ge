import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { TourCategoryId } from './tour-categories';
import { parseTourCategory } from './tour-categories';
import type { WhatToDoCategoryId } from './what-to-do-categories';
import { normalizeWhatToDoCategoriesFromRaw } from './what-to-do-categories';
import type { WhatToDoSeasonId } from './what-to-do-seasons';
import { normalizeWhatToDoSeasonsFromRaw } from './what-to-do-seasons';

/** Tour category or “What to do” category, depending on store file. */
export type PostCategoryId = TourCategoryId | WhatToDoCategoryId;
import type { TourPhysicalRatingId } from './tour-physical-rating';
import { parseDrivingDistance, parseTourPhysicalRating } from './tour-physical-rating';
import type { Locale } from './strings';
import type { ContactSocialLinks } from './contact-social-links';
import { normalizeSocialLinksFromJson, trimSocialLinks } from './contact-social-links';
import { parseGoogleMapsDirectionsUrl } from './google-maps-urls';

import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();

/** Shared JSON shape with tours; used for “What to do” and any future lists. */
export type ContentPostKind = 'tours' | 'what-to-do';

const STORE_FILES: Record<ContentPostKind, string> = {
	tours: 'tours.json',
	'what-to-do': 'what-to-do.json',
};

const URL_SEGMENTS: Record<ContentPostKind, string> = {
	tours: 'tours',
	'what-to-do': 'what-to-do',
};

function storePath(kind: ContentPostKind): string {
	return path.join(DATA_DIR, STORE_FILES[kind]);
}

export function urlSegmentForContentKind(kind: ContentPostKind): string {
	return URL_SEGMENTS[kind];
}

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

/** Shared map pin for a tour (WGS84). Optional label overrides popup title. */
export type TourLocation = {
	lat: number;
	lng: number;
	/** Short map label (e.g. town); popup uses tour title if empty */
	label: string | null;
};

export type TourLocaleBlock = {
	title: string;
	duration: string;
	price: string | null;
	excerpt: string;
	seo_title: string | null;
	seo_description: string | null;
	body: string;
	/** Markdown; “What to do” detail right column contact box only (optional). */
	contact_sidebar: string;
};

/** One logical tour: shared slug, cover, gallery; copy varies by language in `i18n`. */
export type TourPost = {
	id: string;
	slug: string;
	image: string | null;
	gallery: string[];
	/** Map pin; omit or null if not on map */
	location: TourLocation | null;
	/** Tour category (tours only); null for what-to-do */
	category: PostCategoryId | null;
	/** What-to-do category tags (empty for tours) */
	whatDoCategories: WhatToDoCategoryId[];
	/** What-to-do seasons / best time (empty for tours) */
	whatDoSeasons: WhatToDoSeasonId[];
	/** Hiking / exertion level */
	physical_rating: TourPhysicalRatingId | null;
	/** Free-text route distance (e.g. driving) */
	driving_distance: string | null;
	/** Google Maps directions URL (what-to-do; optional). */
	google_directions_url: string | null;
	/** Shared social / contact URLs for what-to-do (all locales). */
	social_links: ContactSocialLinks;
	/**
	 * Region / municipality / village post ids from regions.json (what-to-do only).
	 * Rivers or routes may list several; tours use [].
	 */
	place_ids: string[];
	i18n: Partial<Record<Locale, TourLocaleBlock>>;
	updated_at: number;
	/** Submitter (contributor); visible to admins only on live site. */
	author_user_id: string | null;
	author_email: string | null;
};

export type TourFrontmatter = {
	title: string;
	locale: Locale;
	slug: string;
	duration: string;
	price?: string;
	excerpt: string;
	image?: string;
	gallery?: string[];
	/** Shared map pin (same for all locales) */
	location?: TourLocation | null;
	category?: PostCategoryId | null;
	whatDoCategories?: WhatToDoCategoryId[];
	whatDoSeasons?: WhatToDoSeasonId[];
	physical_rating?: TourPhysicalRatingId | null;
	driving_distance?: string | null;
	google_directions_url?: string | null;
	seoTitle?: string;
	seoDescription?: string;
};

export type TourListItem = {
	slug: string;
	data: TourFrontmatter;
	body: string;
};

/** Flat row for one locale (derived from TourPost + locale). */
export type TourRow = {
	id: string;
	slug: string;
	locale: Locale;
	title: string;
	duration: string;
	price: string | null;
	excerpt: string;
	image: string | null;
	gallery: string[];
	location: TourLocation | null;
	category: PostCategoryId | null;
	whatDoCategories: WhatToDoCategoryId[];
	whatDoSeasons: WhatToDoSeasonId[];
	physical_rating: TourPhysicalRatingId | null;
	driving_distance: string | null;
	google_directions_url: string | null;
	seo_title: string | null;
	seo_description: string | null;
	body: string;
	contact_sidebar: string;
	social_links: ContactSocialLinks;
	/** what-to-do: linked region/municipality/village ids */
	place_ids: string[];
	updated_at: number;
	author_user_id: string | null;
	author_email: string | null;
};

type JsonFile = Record<string, unknown>;

const MAX_GALLERY_IMAGES = 30;

function scrubGalleryToken(s: string): string {
	return s.replace(/\uFEFF/g, '').trim();
}

export function normalizeTourGalleryInput(input: unknown): string[] {
	if (input == null) return [];
	if (typeof input === 'string') {
		const parts = input
			.split(/[\r\n,]+/)
			.map((s) => scrubGalleryToken(s))
			.filter(Boolean);
		return dedupeGalleryUrls(parts);
	}
	if (!Array.isArray(input)) return [];
	const parts = input
		.filter((x): x is string => typeof x === 'string')
		.map((s) => scrubGalleryToken(s))
		.filter(Boolean);
	return dedupeGalleryUrls(parts);
}

function dedupeGalleryUrls(urls: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const u of urls) {
		if (seen.has(u)) continue;
		seen.add(u);
		out.push(u);
		if (out.length >= MAX_GALLERY_IMAGES) break;
	}
	return out;
}

export function tourCoverImageUrl(d: {
	image?: string | null;
	gallery?: string[] | null;
}): string | undefined {
	const i = d.image ? scrubGalleryToken(d.image) : '';
	if (i) return i;
	for (const g of d.gallery ?? []) {
		const t = typeof g === 'string' ? scrubGalleryToken(g) : '';
		if (t) return t;
	}
	return undefined;
}

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

export function isLocale(s: string): s is Locale {
	return s === 'en' || s === 'ka' || s === 'ru';
}

export function isValidSlug(s: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s) && s.length <= 120;
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidTourId(id: string): boolean {
	return UUID_RE.test(id);
}

/** Parse JSON or API `location` object; returns null if missing or invalid. */
export function parseTourLocation(raw: unknown): TourLocation | null {
	if (raw == null) return null;
	if (typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const latN = typeof o.lat === 'number' ? o.lat : typeof o.lat === 'string' ? parseFloat(o.lat) : NaN;
	const lngN = typeof o.lng === 'number' ? o.lng : typeof o.lng === 'string' ? parseFloat(o.lng) : NaN;
	if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
	if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return null;
	const lr = o.label;
	const label =
		lr == null || lr === '' ? null : typeof lr === 'string' ? lr.trim() || null : null;
	return { lat: latN, lng: lngN, label };
}

/** Map layer: tours, what-to-do, or administrative geography posts */
export type MapMarkerPostKind = ContentPostKind | 'regions';

export type TourMapMarker = {
	slug: string;
	title: string;
	lat: number;
	lng: number;
	label: string | null;
	href: string;
	kind: MapMarkerPostKind;
	/** `tour` for tours; what-to-do category id for activities (drives map pin icon). */
	mapIconKey: string;
	coverUrl: string | null;
	excerpt: string;
	/** Tour category id when `kind === 'tours'`; otherwise null. */
	tourCategory: string | null;
	/** All what-to-do category ids when `kind === 'what-to-do'`; otherwise []. */
	whatDoCategoryIds: string[];
};

export function listMapMarkersForKind(kind: ContentPostKind, locale: string): TourMapMarker[] {
	if (!isLocale(locale)) return [];
	const posts = getPosts(kind);
	const seg = URL_SEGMENTS[kind];
	const out: TourMapMarker[] = [];
	for (const p of posts) {
		const loc = p.location;
		if (!loc) continue;
		const block = p.i18n[locale];
		const title = block?.title?.trim();
		if (!title) continue;
		const excerpt = block.excerpt?.trim() ?? '';
		const cover = tourCoverImageUrl({ image: p.image, gallery: p.gallery });
		const mapIconKey =
			kind === 'tours'
				? 'tour'
				: p.whatDoCategories?.length
					? p.whatDoCategories[0]
					: 'landmark';
		const tourCategory = kind === 'tours' ? (p.category ?? null) : null;
		const whatDoCategoryIds =
			kind === 'what-to-do' ? [...(p.whatDoCategories ?? [])] : [];
		out.push({
			slug: p.slug,
			title,
			lat: loc.lat,
			lng: loc.lng,
			label: loc.label,
			href: `/${locale}/${seg}/${p.slug}`,
			kind,
			mapIconKey,
			coverUrl: cover ?? null,
			excerpt,
			tourCategory,
			whatDoCategoryIds,
		});
	}
	return out;
}

export function listTourMapMarkers(locale: string): TourMapMarker[] {
	return listMapMarkersForKind('tours', locale);
}

export function listWhatToDoMapMarkers(locale: string): TourMapMarker[] {
	return listMapMarkersForKind('what-to-do', locale);
}

/** Form fields `location_lat`, `location_lng`, `location_label` (shared across locales). */
export function parseTourLocationFromForm(fields: Record<string, string>):
	| { kind: 'empty' }
	| { kind: 'ok'; value: TourLocation }
	| { kind: 'error'; message: string } {
	const latS = (fields.location_lat ?? '').trim();
	const lngS = (fields.location_lng ?? '').trim();
	const labelS = (fields.location_label ?? '').trim();
	if (!latS && !lngS) return { kind: 'empty' };
	const lat = parseFloat(latS);
	const lng = parseFloat(lngS);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return { kind: 'error', message: 'Latitude and longitude must be valid numbers' };
	}
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		return { kind: 'error', message: 'Coordinates out of range (lat ±90, lng ±180)' };
	}
	return { kind: 'ok', value: { lat, lng, label: labelS || null } };
}

function normalizeLocaleBlock(raw: unknown): TourLocaleBlock | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const title = String(o.title ?? '').trim();
	const duration = String(o.duration ?? '').trim();
	const excerpt = String(o.excerpt ?? '').trim();
	if (!title || !duration || !excerpt) return null;
	const p = o.price;
	const st = o.seo_title;
	const sd = o.seo_description;
	const contact_sidebar = String(o.contact_sidebar ?? '').trim();
	const block: TourLocaleBlock = {
		title,
		duration,
		price: p == null || p === '' ? null : String(p),
		excerpt,
		seo_title: st == null || st === '' ? null : String(st),
		seo_description: sd == null || sd === '' ? null : String(sd),
		body: String(o.body ?? '').trim(),
		contact_sidebar,
	};
	return block;
}

function normalizePlaceIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	const seen = new Set<string>();
	for (const el of raw) {
		if (typeof el !== 'string') continue;
		const id = el.trim();
		if (!isValidTourId(id) || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

function normalizePost(raw: unknown, kind: ContentPostKind): TourPost | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' ? o.id : '';
	const slug = typeof o.slug === 'string' ? o.slug : '';
	if (!isValidTourId(id) || !slug) return null;
	const i18nRaw = o.i18n;
	let postSocial = trimSocialLinks(normalizeSocialLinksFromJson(o.social_links) ?? {});
	if (
		Object.keys(postSocial).length === 0 &&
		i18nRaw &&
		typeof i18nRaw === 'object' &&
		!Array.isArray(i18nRaw)
	) {
		for (const loc of LOCALES) {
			const rawB = (i18nRaw as Record<string, unknown>)[loc];
			if (!rawB || typeof rawB !== 'object') continue;
			const leg = normalizeSocialLinksFromJson((rawB as Record<string, unknown>).social_links);
			const t = trimSocialLinks(leg ?? {});
			if (Object.keys(t).length) {
				postSocial = t;
				break;
			}
		}
	}
	const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
	if (i18nRaw && typeof i18nRaw === 'object') {
		for (const loc of LOCALES) {
			const b = normalizeLocaleBlock((i18nRaw as Record<string, unknown>)[loc]);
			if (b) i18n[loc] = b;
		}
	}
	const img = o.image;
	const category = kind === 'tours' ? parseTourCategory(o.category) : null;
	const whatDoCategories =
		kind === 'what-to-do'
			? normalizeWhatToDoCategoriesFromRaw(o.categories, o.category)
			: [];
	const whatDoSeasons =
		kind === 'what-to-do' ? normalizeWhatToDoSeasonsFromRaw(o.seasons, o.season) : [];
	const place_ids = kind === 'what-to-do' ? normalizePlaceIds(o.place_ids) : [];
	return {
		id,
		slug,
		image: img == null || img === '' ? null : String(img),
		gallery: normalizeTourGalleryInput(o.gallery),
		location: parseTourLocation(o.location),
		category,
		whatDoCategories,
		whatDoSeasons,
		place_ids,
		physical_rating: parseTourPhysicalRating(o.physical_rating),
		driving_distance: parseDrivingDistance(o.driving_distance),
		google_directions_url: parseGoogleMapsDirectionsUrl(o.google_directions_url),
		social_links: postSocial,
		i18n,
		updated_at: typeof o.updated_at === 'number' ? o.updated_at : Date.now(),
		author_user_id:
			typeof o.author_user_id === 'string' && o.author_user_id.trim() ? o.author_user_id.trim() : null,
		author_email:
			typeof o.author_email === 'string' && o.author_email.trim() ? o.author_email.trim() : null,
	};
}

type LegacyTourRow = {
	id: string;
	slug: string;
	locale: string;
	title: string;
	duration: string;
	price: string | null;
	excerpt: string;
	image: string | null;
	gallery: string[];
	seo_title: string | null;
	seo_description: string | null;
	body: string;
	updated_at: number;
};

function normalizeLegacyRow(raw: unknown): LegacyTourRow | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' ? o.id : '';
	const slug = typeof o.slug === 'string' ? o.slug : '';
	const loc = o.locale;
	if (!isLocale(loc) || !isValidTourId(id) || !slug) return null;
	const st = o.seo_title;
	const sd = o.seo_description;
	return {
		id,
		slug,
		locale: loc,
		title: String(o.title ?? ''),
		duration: String(o.duration ?? ''),
		price: o.price == null || o.price === '' ? null : String(o.price),
		excerpt: String(o.excerpt ?? ''),
		image: o.image == null || o.image === '' ? null : String(o.image),
		gallery: normalizeTourGalleryInput(o.gallery),
		seo_title: st == null || st === '' ? null : String(st),
		seo_description: sd == null || sd === '' ? null : String(sd),
		body: String(o.body ?? ''),
		updated_at: typeof o.updated_at === 'number' ? o.updated_at : Date.now(),
	};
}

function migrateLegacyToPosts(rows: LegacyTourRow[]): TourPost[] {
	const bySlug = new Map<string, LegacyTourRow[]>();
	for (const r of rows) {
		const g = bySlug.get(r.slug) ?? [];
		g.push(r);
		bySlug.set(r.slug, g);
	}
	const posts: TourPost[] = [];
	for (const [, group] of bySlug) {
		const pick = (loc: Locale) => group.find((x) => x.locale === loc);
		const en = pick('en');
		const ka = pick('ka');
		const ru = pick('ru');
		const id = en?.id ?? group[0].id;
		let image: string | null = null;
		for (const p of [en, ka, ru]) {
			if (p?.image) {
				image = p.image;
				break;
			}
		}
		let gallery: string[] = [];
		for (const row of group) {
			if (row.gallery.length > gallery.length) gallery = row.gallery;
		}
		const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
		for (const row of group) {
			if (!isLocale(row.locale)) continue;
			const b = normalizeLocaleBlock({
				title: row.title,
				duration: row.duration,
				price: row.price,
				excerpt: row.excerpt,
				seo_title: row.seo_title,
				seo_description: row.seo_description,
				body: row.body,
				contact_sidebar: '',
			});
			if (b) i18n[row.locale] = b;
		}
		const slug = group[0].slug;
		const updated_at = Math.max(...group.map((g) => g.updated_at));
		posts.push({
			id,
			slug,
			image,
			gallery,
			location: null,
			category: null,
			whatDoCategories: [],
			whatDoSeasons: [],
			place_ids: [],
			physical_rating: null,
			driving_distance: null,
			google_directions_url: null,
			social_links: {},
			i18n,
			updated_at,
			author_user_id: null,
			author_email: null,
		});
	}
	return posts;
}

function readPostsFromDisk(kind: ContentPostKind): TourPost[] {
	ensureDataDir();
	const file = storePath(kind);
	if (kind === 'what-to-do') {
		if (!existsSync(file)) {
			writePostsStore(kind, []);
			return [];
		}
		try {
			const parsed = JSON.parse(readFileSync(file, 'utf-8')) as JsonFile;
			const postsRaw = parsed.posts;
			if (!Array.isArray(postsRaw)) return [];
			return postsRaw.map((r) => normalizePost(r, 'what-to-do')).filter((p): p is TourPost => p !== null);
		} catch {
			return [];
		}
	}
	if (!existsSync(file)) {
		const fromMd = importFromMarkdownPosts();
		writePostsStore('tours', fromMd);
		return fromMd;
	}
	try {
		const parsed = JSON.parse(readFileSync(file, 'utf-8')) as JsonFile;
		const postsRaw = parsed.posts;
		if (Array.isArray(postsRaw)) {
			return postsRaw.map((r) => normalizePost(r, 'tours')).filter((p): p is TourPost => p !== null);
		}
		const toursRaw = parsed.tours;
		if (Array.isArray(toursRaw)) {
			const legacy = toursRaw.map(normalizeLegacyRow).filter((r): r is LegacyTourRow => r !== null);
			const migrated = migrateLegacyToPosts(legacy);
			writePostsStore('tours', migrated);
			return migrated;
		}
		return [];
	} catch {
		return [];
	}
}

/** Per-store cache; reload when mtime changes on disk. */
const postCache = new Map<ContentPostKind, { posts: TourPost[]; mtime: number }>();

function fileMtime(kind: ContentPostKind): number {
	const file = storePath(kind);
	if (!existsSync(file)) return 0;
	try {
		return statSync(file).mtimeMs;
	} catch {
		return 0;
	}
}

function getPosts(kind: ContentPostKind): TourPost[] {
	const file = storePath(kind);
	if (!existsSync(file)) {
		const posts = readPostsFromDisk(kind);
		postCache.set(kind, { posts, mtime: fileMtime(kind) });
		return posts;
	}
	const mtime = fileMtime(kind);
	const prev = postCache.get(kind);
	if (prev === undefined || mtime > prev.mtime) {
		const posts = readPostsFromDisk(kind);
		postCache.set(kind, { posts, mtime });
		return posts;
	}
	return prev.posts;
}

export function invalidateToursCache() {
	postCache.delete('tours');
}

export function invalidateWhatToDoCache() {
	postCache.delete('what-to-do');
}

function postToDiskJson(kind: ContentPostKind, post: TourPost): Record<string, unknown> {
	if (kind === 'what-to-do') {
		const { whatDoCategories, whatDoSeasons, category: _cat, ...rest } = post;
		return { ...rest, categories: whatDoCategories, seasons: whatDoSeasons };
	}
	const { whatDoCategories: _w, whatDoSeasons: _s, place_ids: _p, ...rest } = post;
	return rest as Record<string, unknown>;
}

function writePostsStore(kind: ContentPostKind, posts: TourPost[]) {
	ensureDataDir();
	const file = storePath(kind);
	const serial = posts.map((p) => postToDiskJson(kind, p));
	writeFileSync(file, `${JSON.stringify({ posts: serial }, null, 2)}\n`, 'utf-8');
	postCache.set(kind, { posts, mtime: fileMtime(kind) });
}

function importFromMarkdownPosts(): TourPost[] {
	const root = path.join(process.cwd(), 'src', 'content', 'tours');
	if (!existsSync(root)) return [];

	const now = Date.now();
	const legacy: LegacyTourRow[] = [];

	for (const loc of LOCALES) {
		const dir = path.join(root, loc);
		if (!existsSync(dir)) continue;
		for (const file of readdirSync(dir)) {
			if (!file.endsWith('.md')) continue;
			const fileSlug = file.slice(0, -3);
			const raw = readFileSync(path.join(dir, file), 'utf-8');
			const { data, content } = matter(raw);
			const d = data as Record<string, string | undefined>;
			const slug = (d.slug || fileSlug).trim();
			const title = (d.title || '').trim();
			if (!title) continue;
			legacy.push({
				id: randomUUID(),
				slug,
				locale: loc,
				title,
				duration: (d.duration || '').trim(),
				price: d.price?.trim() || null,
				excerpt: (d.excerpt || '').trim(),
				image: d.image?.trim() || null,
				gallery: normalizeTourGalleryInput((d as Record<string, unknown>).gallery),
				seo_title: null,
				seo_description: null,
				body: content.trim() || '',
				updated_at: now,
			});
		}
	}
	return migrateLegacyToPosts(legacy);
}

/** Derive a per-locale row from any tour/what-to-do post (including synthetic preview posts). */
export function flattenTourPostToRow(post: TourPost, locale: Locale): TourRow | null {
	return flattenPost(post, locale);
}

function flattenPost(post: TourPost, locale: Locale): TourRow | null {
	const block = post.i18n[locale];
	if (!block) return null;
	return {
		id: post.id,
		slug: post.slug,
		locale,
		title: block.title,
		duration: block.duration,
		price: block.price,
		excerpt: block.excerpt,
		image: post.image,
		gallery: post.gallery,
		location: post.location,
		category: post.category,
		whatDoCategories: post.whatDoCategories,
		whatDoSeasons: post.whatDoSeasons,
		place_ids: post.place_ids ?? [],
		physical_rating: post.physical_rating,
		driving_distance: post.driving_distance,
		google_directions_url: post.google_directions_url ?? null,
		seo_title: block.seo_title,
		seo_description: block.seo_description,
		body: block.body,
		contact_sidebar: block.contact_sidebar ?? '',
		social_links: trimSocialLinks(post.social_links),
		updated_at: post.updated_at,
		author_user_id: post.author_user_id ?? null,
		author_email: post.author_email ?? null,
	};
}

function rowToListItem(row: TourRow): TourListItem {
	return {
		slug: row.slug,
		data: {
			title: row.title,
			locale: row.locale,
			slug: row.slug,
			duration: row.duration,
			price: row.price ?? undefined,
			excerpt: row.excerpt,
			image: row.image ?? undefined,
			gallery: row.gallery.length ? row.gallery : undefined,
			location: row.location ?? undefined,
			category: row.category ?? undefined,
			whatDoCategories: row.whatDoCategories.length ? row.whatDoCategories : undefined,
			whatDoSeasons: row.whatDoSeasons.length ? row.whatDoSeasons : undefined,
			physical_rating: row.physical_rating ?? undefined,
			driving_distance: row.driving_distance ?? undefined,
			google_directions_url: row.google_directions_url ?? undefined,
			seoTitle: row.seo_title ?? undefined,
			seoDescription: row.seo_description ?? undefined,
		},
		body: row.body,
	};
}

export function listToursForLocale(locale: string): TourListItem[] {
	if (!isLocale(locale)) return [];
	const posts = getPosts('tours');
	const out: TourListItem[] = [];
	for (const p of posts) {
		const row = flattenPost(p, locale);
		if (row) out.push(rowToListItem(row));
	}
	return out.sort((a, b) =>
		a.data.title.localeCompare(b.data.title, undefined, { sensitivity: 'base' }),
	);
}

export function listWhatToDoForLocale(locale: string): TourListItem[] {
	if (!isLocale(locale)) return [];
	const posts = getPosts('what-to-do');
	const out: TourListItem[] = [];
	for (const p of posts) {
		const row = flattenPost(p, locale);
		if (row) out.push(rowToListItem(row));
	}
	return out.sort((a, b) =>
		a.data.title.localeCompare(b.data.title, undefined, { sensitivity: 'base' }),
	);
}

const SIMILAR_TOURS_DEFAULT_LIMIT = 4;

/**
 * Other tours in the same locale, excluding `excludeSlug`.
 * Tours: prefers the same `category` when set. What-to-do: prefers items that share any category tag.
 */
function getSimilarForKind(
	kind: ContentPostKind,
	locale: string,
	excludeSlug: string,
	category: PostCategoryId | null,
	limit: number = SIMILAR_TOURS_DEFAULT_LIMIT,
	whatDoCategoryTags: WhatToDoCategoryId[] | null = null,
): TourListItem[] {
	if (!isLocale(locale) || !isValidSlug(excludeSlug)) return [];
	const listFn = kind === 'tours' ? listToursForLocale : listWhatToDoForLocale;
	const all = listFn(locale).filter((t) => t.data.slug !== excludeSlug);
	if (all.length === 0) return [];

	const same: TourListItem[] = [];
	const other: TourListItem[] = [];
	for (const t of all) {
		if (kind === 'tours') {
			if (category && t.data.category === category) same.push(t);
			else other.push(t);
		} else {
			const postTags = t.data.whatDoCategories ?? [];
			const want = whatDoCategoryTags ?? [];
			if (want.length > 0 && postTags.some((x) => want.includes(x))) same.push(t);
			else other.push(t);
		}
	}
	const byTitle = (a: TourListItem, b: TourListItem) =>
		a.data.title.localeCompare(b.data.title, undefined, { sensitivity: 'base' });
	same.sort(byTitle);
	other.sort(byTitle);
	return [...same, ...other].slice(0, limit);
}

export function getSimilarTours(
	locale: string,
	excludeSlug: string,
	category: PostCategoryId | null,
	limit: number = SIMILAR_TOURS_DEFAULT_LIMIT,
): TourListItem[] {
	return getSimilarForKind('tours', locale, excludeSlug, category, limit, null);
}

export function getSimilarWhatToDo(
	locale: string,
	excludeSlug: string,
	whatDoCategoryTags: WhatToDoCategoryId[] | null,
	limit: number = SIMILAR_TOURS_DEFAULT_LIMIT,
): TourListItem[] {
	return getSimilarForKind('what-to-do', locale, excludeSlug, null, limit, whatDoCategoryTags);
}

export function getTourBySlug(locale: string, slug: string): TourListItem | null {
	const row = getTourRowBySlug(locale, slug);
	return row ? rowToListItem(row) : null;
}

export function getWhatToDoRowBySlug(locale: string, slug: string): TourRow | null {
	if (!isLocale(locale) || !isValidSlug(slug)) return null;
	const posts = getPosts('what-to-do');
	const post = posts.find((p) => p.slug === slug);
	if (!post) return null;
	return flattenPost(post, locale);
}

export function getWhatToDoBySlug(locale: string, slug: string): TourListItem | null {
	const row = getWhatToDoRowBySlug(locale, slug);
	return row ? rowToListItem(row) : null;
}

export function getTourRowBySlug(locale: string, slug: string): TourRow | null {
	if (!isLocale(locale) || !isValidSlug(slug)) return null;
	const posts = getPosts('tours');
	const post = posts.find((p) => p.slug === slug);
	if (!post) return null;
	return flattenPost(post, locale);
}

export function getContentPostById(kind: ContentPostKind, id: string): TourPost | null {
	if (!isValidTourId(id)) return null;
	return getPosts(kind).find((p) => p.id === id) ?? null;
}

/** Title + slug saved on activity-log rows (English-first title fallback). */
export function postSnapshotForActivity(post: TourPost): { postTitle: string; postSlug: string } {
	const block = post.i18n.en ?? post.i18n.ka ?? post.i18n.ru;
	const postTitle = block?.title?.trim() || post.slug;
	return { postTitle, postSlug: post.slug };
}

export function findContentPostBySlug(kind: ContentPostKind, slug: string): TourPost | null {
	return getPosts(kind).find((p) => p.slug === slug) ?? null;
}

/** True if a different post (not `exceptPostId`) already uses this slug. */
export function isTourSlugUsedByAnotherPost(
	kind: ContentPostKind,
	slug: string,
	exceptPostId?: string | null,
): boolean {
	return getPosts(kind).some((p) => p.slug === slug && (!exceptPostId || p.id !== exceptPostId));
}

export function deleteContentPostById(
	kind: ContentPostKind,
	id: string,
): { ok: true } | { ok: false; error: string } {
	if (!isValidTourId(id)) return { ok: false, error: 'Invalid id' };
	const posts = [...getPosts(kind)];
	const i = posts.findIndex((p) => p.id === id);
	if (i === -1) return { ok: false, error: 'Post not found' };
	posts.splice(i, 1);
	writePostsStore(kind, posts);
	return { ok: true };
}

export function getTourPostById(id: string): TourPost | null {
	return getContentPostById('tours', id);
}

export function getWhatToDoPostById(id: string): TourPost | null {
	return getContentPostById('what-to-do', id);
}

/** @deprecated use getTourPostById — kept for any stray imports */
export function getTourRowById(id: string): TourRow | null {
	const post = getTourPostById(id);
	if (!post) return null;
	for (const loc of LOCALES) {
		const row = flattenPost(post, loc);
		if (row) return row;
	}
	return null;
}

export type AdminTourListItem = {
	id: string;
	slug: string;
	titles: Record<Locale, string>;
	locales: Locale[];
	author_email: string | null;
	/** Tour category (tours only; null for what-to-do) */
	category: string | null;
	/** What-to-do category tags (what-to-do only; empty for tours) */
	whatDoCategories: string[];
};

function listAllAdminForKind(kind: ContentPostKind): AdminTourListItem[] {
	const posts = getPosts(kind);
	return [...posts]
		.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' }))
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
				titles,
				locales,
				author_email: p.author_email ?? null,
				category: p.category ?? null,
				whatDoCategories: p.whatDoCategories ?? [],
			};
		});
}

export function listAllToursAdmin(): AdminTourListItem[] {
	return listAllAdminForKind('tours');
}

export function listAllWhatToDoAdmin(): AdminTourListItem[] {
	return listAllAdminForKind('what-to-do');
}

/** Full posts for features that need `place_ids` etc. Inlined read avoids bundler issues with the internal `getPosts` symbol across chunks. */
export function getAllWhatToDoPosts(): TourPost[] {
	const kind: ContentPostKind = 'what-to-do';
	const file = storePath(kind);
	if (!existsSync(file)) {
		const posts = readPostsFromDisk(kind);
		postCache.set(kind, { posts, mtime: fileMtime(kind) });
		return posts;
	}
	const mtime = fileMtime(kind);
	const prev = postCache.get(kind);
	if (prev === undefined || mtime > prev.mtime) {
		const posts = readPostsFromDisk(kind);
		postCache.set(kind, { posts, mtime });
		return posts;
	}
	return prev.posts;
}

export type SaveTourPostInput = {
	id?: string;
	slug: string;
	image?: string | null;
	gallery?: string[];
	/** Omit to keep previous on update; `null` clears the pin */
	location?: TourLocation | null;
	/** Tour category only; ignored for what-to-do */
	category?: PostCategoryId | null;
	/** What-to-do category tags; ignored for tours */
	whatDoCategories?: WhatToDoCategoryId[] | null;
	/** What-to-do only; ignored for tours */
	whatDoSeasons?: WhatToDoSeasonId[] | null;
	/** What-to-do: region/municipality/village ids; ignored for tours */
	place_ids?: string[] | null;
	physical_rating?: TourPhysicalRatingId | null;
	driving_distance?: string | null;
	/** What-to-do only; ignored for tours */
	google_directions_url?: string | null;
	/** Shared for the whole post; omit on update to keep previous */
	social_links?: ContactSocialLinks;
	i18n: Partial<Record<Locale, TourLocaleBlock>>;
	mode: 'create' | 'update';
	author_user_id?: string | null;
	author_email?: string | null;
};

/** Slug + per-locale rules only (no uniqueness). Used before queuing a contributor submission. */
export function validateTourPostI18nAndSlug(
	slug: string,
	i18n: Partial<Record<Locale, TourLocaleBlock>>,
): { ok: true } | { ok: false; error: string } {
	if (!isValidSlug(slug)) {
		return { ok: false, error: 'Invalid slug (use lowercase letters, numbers, hyphens)' };
	}

	const filledLocales = LOCALES.filter((l) => {
		const b = i18n[l];
		if (!b) return false;
		return !!(b.title?.trim() && b.duration?.trim() && b.excerpt?.trim());
	});
	if (filledLocales.length === 0) {
		return {
			ok: false,
			error: 'Add at least one language with title, duration, and excerpt filled in',
		};
	}

	for (const loc of LOCALES) {
		const b = i18n[loc];
		if (!b) continue;
		const t = b.title?.trim() ?? '';
		const d = b.duration?.trim() ?? '';
		const e = b.excerpt?.trim() ?? '';
		if ((t || d || e) && !(t && d && e)) {
			return {
				ok: false,
				error: `Incomplete ${loc}: fill title, duration, and excerpt (or clear all three for that language)`,
			};
		}
	}

	return { ok: true };
}

export function isTourSlugTakenInStore(kind: ContentPostKind, slug: string): boolean {
	return getPosts(kind).some((p) => p.slug === slug);
}

function savePostForKind(
	kind: ContentPostKind,
	input: SaveTourPostInput,
): { ok: true } | { ok: false; error: string } {
	const {
		id,
		slug,
		image,
		gallery,
		location: locationInput,
		category: categoryInput,
		whatDoCategories: whatDoCategoriesInput,
		whatDoSeasons: whatDoSeasonsInput,
		place_ids: placeIdsInput,
		physical_rating: physicalRatingInput,
		driving_distance: drivingDistanceInput,
		google_directions_url: googleDirectionsInput,
		social_links: socialLinksInput,
		i18n,
		mode,
		author_user_id: authorUserIn,
		author_email: authorEmailIn,
	} = input;

	const noun = kind === 'tours' ? 'tour' : 'entry';
	const nounCap = kind === 'tours' ? 'Tour' : 'Entry';

	const baseValid = validateTourPostI18nAndSlug(slug, i18n);
	if (!baseValid.ok) return baseValid;

	const now = Date.now();
	const galleryInput = gallery ?? [];
	const galleryVal = normalizeTourGalleryInput(galleryInput);
	const posts = [...getPosts(kind)];

	const cleanI18n: Partial<Record<Locale, TourLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const b = i18n[loc];
		if (!b) continue;
		const t = b.title.trim();
		const d = b.duration.trim();
		const e = b.excerpt.trim();
		if (!t || !d || !e) continue;
		const p = b.price?.trim();
		const st = b.seo_title?.trim();
		const sd = b.seo_description?.trim();
		const locBlock: TourLocaleBlock = {
			title: t,
			duration: d,
			price: p ? p : null,
			excerpt: e,
			seo_title: st ? st : null,
			seo_description: sd ? sd : null,
			body: (b.body ?? '').trim(),
			contact_sidebar: (b.contact_sidebar ?? '').trim(),
		};
		cleanI18n[loc] = locBlock;
	}

	if (mode === 'create') {
		if (posts.some((p) => p.slug === slug)) {
			return { ok: false, error: `A ${noun} with this slug already exists` };
		}
		const createImage =
			image !== undefined ? (typeof image === 'string' && image.trim() ? image.trim() : null) : null;
		const createLocation = locationInput === undefined ? null : locationInput;
		const createCategory = kind === 'tours' ? (categoryInput === undefined ? null : categoryInput) : null;
		const createWhatDoCats =
			kind === 'what-to-do'
				? whatDoCategoriesInput === undefined
					? []
					: whatDoCategoriesInput ?? []
				: [];
		const createWhatDoSeasons =
			kind === 'what-to-do'
				? whatDoSeasonsInput === undefined
					? []
					: whatDoSeasonsInput ?? []
				: [];
		const createPlaceIds =
			kind === 'what-to-do'
				? placeIdsInput === undefined
					? []
					: normalizePlaceIds(placeIdsInput)
				: [];
		const createPhysicalRating = physicalRatingInput === undefined ? null : physicalRatingInput;
		const createDrivingDistance = drivingDistanceInput === undefined ? null : drivingDistanceInput;
		const createGoogleDirections =
			kind === 'what-to-do' ? (googleDirectionsInput ?? null) : null;
		const createSocial = trimSocialLinks(socialLinksInput ?? {});
		const au =
			authorUserIn !== undefined && authorUserIn !== null && String(authorUserIn).trim()
				? String(authorUserIn).trim()
				: null;
		const ae =
			authorEmailIn !== undefined && authorEmailIn !== null && String(authorEmailIn).trim()
				? String(authorEmailIn).trim()
				: null;
		posts.push({
			id: randomUUID(),
			slug,
			image: createImage,
			gallery: galleryVal,
			location: createLocation,
			category: createCategory,
			whatDoCategories: createWhatDoCats,
			whatDoSeasons: createWhatDoSeasons,
			place_ids: createPlaceIds,
			physical_rating: createPhysicalRating,
			driving_distance: createDrivingDistance,
			google_directions_url: createGoogleDirections,
			social_links: createSocial,
			i18n: cleanI18n,
			updated_at: now,
			author_user_id: au,
			author_email: ae,
		});
		writePostsStore(kind, posts);
		return { ok: true };
	}

	if (!id || !isValidTourId(id)) {
		return { ok: false, error: `Missing or invalid ${noun} id` };
	}

	const idx = posts.findIndex((p) => p.id === id);
	if (idx === -1) {
		return { ok: false, error: `${nounCap} not found` };
	}

	const clash = posts.some((p) => p.slug === slug && p.id !== id);
	if (clash) {
		return { ok: false, error: `Another ${noun} already uses this slug` };
	}

	const prev = posts[idx];
	const nextImage =
		image !== undefined
			? typeof image === 'string' && image.trim()
				? image.trim()
				: null
			: prev.image;
	const nextGallery = gallery !== undefined ? galleryVal : prev.gallery;
	const nextLocation =
		locationInput === undefined ? prev.location : locationInput;
	const nextCategory =
		kind === 'tours' ? (categoryInput === undefined ? prev.category : categoryInput) : null;
	const nextWhatDoCats =
		kind === 'what-to-do'
			? whatDoCategoriesInput === undefined
				? (prev.whatDoCategories ?? [])
				: whatDoCategoriesInput ?? []
			: [];
	const nextWhatDoSeasons =
		kind === 'what-to-do'
			? whatDoSeasonsInput === undefined
				? (prev.whatDoSeasons ?? [])
				: whatDoSeasonsInput ?? []
			: [];
	const nextPlaceIds =
		kind === 'what-to-do'
			? placeIdsInput === undefined
				? (prev.place_ids ?? [])
				: normalizePlaceIds(placeIdsInput)
			: [];
	const nextPhysicalRating =
		physicalRatingInput === undefined ? prev.physical_rating : physicalRatingInput;
	const nextDrivingDistance =
		drivingDistanceInput === undefined ? prev.driving_distance : drivingDistanceInput;
	const nextGoogleDirections =
		kind === 'what-to-do'
			? googleDirectionsInput === undefined
				? (prev.google_directions_url ?? null)
				: googleDirectionsInput
			: null;
	const nextSocial =
		socialLinksInput === undefined
			? trimSocialLinks(prev.social_links ?? {})
			: trimSocialLinks(socialLinksInput);

	const nextAuthorUserId =
		authorUserIn !== undefined
			? authorUserIn !== null && String(authorUserIn).trim()
				? String(authorUserIn).trim()
				: null
			: (prev.author_user_id ?? null);
	const nextAuthorEmail =
		authorEmailIn !== undefined
			? authorEmailIn !== null && String(authorEmailIn).trim()
				? String(authorEmailIn).trim()
				: null
			: (prev.author_email ?? null);

	posts[idx] = {
		...prev,
		slug,
		image: nextImage,
		gallery: nextGallery,
		location: nextLocation,
		category: nextCategory,
		whatDoCategories: nextWhatDoCats,
		whatDoSeasons: nextWhatDoSeasons,
		place_ids: nextPlaceIds,
		physical_rating: nextPhysicalRating,
		driving_distance: nextDrivingDistance,
		google_directions_url: nextGoogleDirections,
		social_links: nextSocial,
		i18n: cleanI18n,
		updated_at: now,
		author_user_id: nextAuthorUserId,
		author_email: nextAuthorEmail,
	};

	writePostsStore(kind, posts);
	return { ok: true };
}

export function saveTourPost(
	input: SaveTourPostInput,
): { ok: true } | { ok: false; error: string } {
	return savePostForKind('tours', input);
}

export function saveWhatToDoPost(
	input: SaveTourPostInput,
): { ok: true } | { ok: false; error: string } {
	return savePostForKind('what-to-do', input);
}

/** Back-compat wrapper for older callers */
export type SaveTourInput = {
	id?: string;
	locale: Locale;
	slug: string;
	title: string;
	duration: string;
	excerpt: string;
	price?: string;
	image?: string;
	gallery?: string[];
	location?: TourLocation | null;
	category?: PostCategoryId | null;
	physical_rating?: TourPhysicalRatingId | null;
	driving_distance?: string | null;
	seo_title?: string;
	seo_description?: string;
	body: string;
	mode: 'create' | 'update';
};

export function saveTour(input: SaveTourInput): { ok: true } | { ok: false; error: string } {
	const {
		id,
		locale,
		slug,
		title,
		duration,
		excerpt,
		price,
		image,
		gallery,
		location,
		category,
		physical_rating,
		driving_distance,
		seo_title,
		seo_description,
		body,
		mode,
	} = input;

	if (mode === 'update' && id) {
		const post = getTourPostById(id);
		if (!post) return { ok: false, error: 'Tour not found' };
		const i18n: Partial<Record<Locale, TourLocaleBlock>> = { ...post.i18n };
		const prevBlock = post.i18n[locale];
		const nextLocale: TourLocaleBlock = {
			title,
			duration,
			price: price?.trim() ? price.trim() : null,
			excerpt,
			seo_title: seo_title?.trim() ? seo_title.trim() : null,
			seo_description: seo_description?.trim() ? seo_description.trim() : null,
			body: body.trim() || '',
			contact_sidebar: prevBlock?.contact_sidebar ?? '',
		};
		i18n[locale] = nextLocale;
		return saveTourPost({
			id,
			slug,
			image: image !== undefined ? (image?.trim() ? image.trim() : null) : post.image,
			gallery: gallery !== undefined ? normalizeTourGalleryInput(gallery) : post.gallery,
			location: location !== undefined ? location : post.location,
			category: category !== undefined ? category : post.category,
			physical_rating: physical_rating !== undefined ? physical_rating : post.physical_rating,
			driving_distance: driving_distance !== undefined ? driving_distance : post.driving_distance,
			social_links: trimSocialLinks(post.social_links ?? {}),
			i18n,
			mode: 'update',
		});
	}

	return saveTourPost({
		slug,
		image: image !== undefined ? (image?.trim() ? image.trim() : null) : null,
		gallery: normalizeTourGalleryInput(gallery ?? []),
		location: location ?? null,
		category: category ?? null,
		physical_rating: physical_rating ?? null,
		driving_distance: driving_distance ?? null,
		social_links: {},
		i18n: {
			[locale]: {
				title,
				duration,
				price: price?.trim() ? price.trim() : null,
				excerpt,
				seo_title: seo_title?.trim() ? seo_title.trim() : null,
				seo_description: seo_description?.trim() ? seo_description.trim() : null,
				body: body.trim() || '',
				contact_sidebar: '',
			},
		},
		mode: 'create',
	});
}
