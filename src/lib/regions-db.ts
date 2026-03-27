import { randomUUID } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import type { Locale } from './strings';
import type { TourLocation, TourMapMarker } from './tours-db';
import {
	isLocale,
	isValidSlug,
	isValidTourId,
	normalizeTourGalleryInput,
	parseTourLocation,
	tourCoverImageUrl,
} from './tours-db';

const DATA_DIR = path.join(process.cwd(), 'data');
const REGIONS_DIR = path.join(DATA_DIR, 'regions');
const REGIONS_INDEX = path.join(REGIONS_DIR, 'index.json');
/** Legacy single-file path — kept only for one-time auto-migration */
const REGIONS_LEGACY = path.join(DATA_DIR, 'regions.json');

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

export type RegionLevel = 'region' | 'municipality' | 'village';

export const REGION_LEVEL_IDS: readonly RegionLevel[] = ['region', 'municipality', 'village'];

export function parseRegionLevel(raw: string): RegionLevel | null {
	const s = raw.trim().toLowerCase();
	if (s === 'region' || s === 'municipality' || s === 'village') return s;
	return null;
}

export type RegionLocaleBlock = {
	title: string;
	subtitle: string | null;
	excerpt: string;
	seo_title: string | null;
	seo_description: string | null;
	body: string;
};

export type RegionPost = {
	id: string;
	slug: string;
	level: RegionLevel;
	/** Parent region or municipality id; null only for top-level regions */
	parent_id: string | null;
	image: string | null;
	gallery: string[];
	location: TourLocation | null;
	population: number | null;
	area_km2: number | null;
	elevation_m: number | null;
	admin_center_name: string | null;
	iso_3166_2: string | null;
	official_code: string | null;
	official_website: string | null;
	wikipedia_url: string | null;
	wikidata_id: string | null;
	geonames_id: string | null;
	settlement_type: string | null;
	i18n: Partial<Record<Locale, RegionLocaleBlock>>;
	updated_at: number;
};

export type AdminRegionListItem = {
	id: string;
	slug: string;
	level: RegionLevel;
	parent_id: string | null;
	titles: Record<Locale, string>;
	locales: Locale[];
};

export type RegionPublicRow = {
	id: string;
	slug: string;
	level: RegionLevel;
	title: string;
	subtitle: string | null;
	excerpt: string;
	body: string;
	seo_title: string | null;
	seo_description: string | null;
	image: string | null;
	gallery: string[];
	location: TourLocation | null;
	population: number | null;
	area_km2: number | null;
	elevation_m: number | null;
	admin_center_name: string | null;
	iso_3166_2: string | null;
	official_code: string | null;
	official_website: string | null;
	wikipedia_url: string | null;
	wikidata_id: string | null;
	geonames_id: string | null;
	settlement_type: string | null;
	updated_at: number;
	breadcrumbs: { slug: string; title: string; level: RegionLevel }[];
	children: { slug: string; title: string; level: RegionLevel }[];
};

function ensureRegionsDir() {
	mkdirSync(REGIONS_DIR, { recursive: true });
}

let cache: { posts: RegionPost[]; mtime: number } | null = null;

/** Cache key: mtime of index.json (changes on every write since writeStore always rewrites it). */
function fileMtime(): number {
	try {
		return statSync(REGIONS_INDEX).mtimeMs;
	} catch {
		return 0;
	}
}

/** Auto-migrate legacy single-file → folder structure (runs at most once). */
function maybeMigrateLegacy(): void {
	if (!existsSync(REGIONS_LEGACY)) return;
	if (existsSync(REGIONS_DIR)) return; // already migrated
	try {
		const raw = JSON.parse(readFileSync(REGIONS_LEGACY, 'utf8')) as { posts?: unknown[] };
		const allPosts: RegionPost[] = [];
		if (Array.isArray(raw.posts)) {
			for (const row of raw.posts) {
				const p = normalizeRegionPost(row);
				if (p) allPosts.push(p);
			}
		}
		mkdirSync(REGIONS_DIR, { recursive: true });
		const indexPosts = allPosts.filter((p) => p.level !== 'village');
		const villages = allPosts.filter((p) => p.level === 'village');
		writeFileSync(REGIONS_INDEX, JSON.stringify({ posts: indexPosts }, null, '\t') + '\n', 'utf8');
		const grouped = new Map<string, RegionPost[]>();
		for (const v of villages) {
			if (!v.parent_id) continue;
			const arr = grouped.get(v.parent_id) ?? [];
			arr.push(v);
			grouped.set(v.parent_id, arr);
		}
		for (const [muniId, muniVillages] of grouped) {
			writeFileSync(
				path.join(REGIONS_DIR, `${muniId}.json`),
				JSON.stringify({ posts: muniVillages }, null, '\t') + '\n',
				'utf8',
			);
		}
		unlinkSync(REGIONS_LEGACY);
	} catch {
		// Migration failed; leave legacy file in place so nothing is lost
	}
}

function readRawStore(): { posts: unknown[] } {
	maybeMigrateLegacy();

	if (!existsSync(REGIONS_DIR)) {
		ensureRegionsDir();
		writeFileSync(REGIONS_INDEX, JSON.stringify({ posts: [] }, null, '\t') + '\n', 'utf8');
		return { posts: [] };
	}

	const all: unknown[] = [];

	// Read index (regions + municipalities)
	if (existsSync(REGIONS_INDEX)) {
		try {
			const j = JSON.parse(readFileSync(REGIONS_INDEX, 'utf8')) as { posts?: unknown[] };
			if (Array.isArray(j.posts)) all.push(...j.posts);
		} catch { /* ignore corrupt index */ }
	}

	// Read all per-municipality village files
	try {
		for (const fname of readdirSync(REGIONS_DIR)) {
			if (!fname.endsWith('.json') || fname === 'index.json') continue;
			try {
				const j = JSON.parse(
					readFileSync(path.join(REGIONS_DIR, fname), 'utf8'),
				) as { posts?: unknown[] };
				if (Array.isArray(j.posts)) all.push(...j.posts);
			} catch { /* ignore corrupt chunk */ }
		}
	} catch { /* ignore if dir read fails */ }

	return { posts: all };
}

function normalizeRegionPost(raw: unknown): RegionPost | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' ? o.id : '';
	const slug = typeof o.slug === 'string' ? o.slug : '';
	const level = parseRegionLevel(typeof o.level === 'string' ? o.level : '');
	if (!isValidTourId(id) || !slug || !level) return null;

	let parent_id: string | null = null;
	if (o.parent_id != null && o.parent_id !== '') {
		if (typeof o.parent_id === 'string' && isValidTourId(o.parent_id)) parent_id = o.parent_id;
		else return null;
	}

	const image = o.image == null || o.image === '' ? null : String(o.image).trim() || null;
	const gallery = normalizeTourGalleryInput(o.gallery);
	const location = parseTourLocation(o.location);

	const population = parseStoredNumber(o.population);
	const area_km2 = parseStoredNumber(o.area_km2);
	const elevation_m = parseStoredNumber(o.elevation_m);

	const str = (k: string) =>
		o[k] == null || o[k] === '' ? null : String(o[k]).trim() || null;

	const i18nRaw = o.i18n;
	const i18n: Partial<Record<Locale, RegionLocaleBlock>> = {};
	if (i18nRaw && typeof i18nRaw === 'object' && !Array.isArray(i18nRaw)) {
		for (const loc of LOCALES) {
			const b = (i18nRaw as Record<string, unknown>)[loc];
			if (!b || typeof b !== 'object') continue;
			const ob = b as Record<string, unknown>;
			const title = String(ob.title ?? '').trim();
			const excerpt = String(ob.excerpt ?? '').trim();
			if (!title && !excerpt) continue;
			i18n[loc] = {
				title,
				subtitle: ob.subtitle == null || ob.subtitle === '' ? null : String(ob.subtitle).trim() || null,
				excerpt,
				seo_title: ob.seo_title == null || ob.seo_title === '' ? null : String(ob.seo_title).trim() || null,
				seo_description:
					ob.seo_description == null || ob.seo_description === ''
						? null
						: String(ob.seo_description).trim() || null,
				body: String(ob.body ?? ''),
			};
		}
	}

	const updated_at =
		typeof o.updated_at === 'number' && Number.isFinite(o.updated_at) ? o.updated_at : 0;

	if (level === 'region' && parent_id !== null) return null;
	if (level !== 'region' && parent_id === null) return null;

	return {
		id,
		slug,
		level,
		parent_id,
		image,
		gallery,
		location,
		population,
		area_km2,
		elevation_m,
		admin_center_name: str('admin_center_name'),
		iso_3166_2: str('iso_3166_2'),
		official_code: str('official_code'),
		official_website: str('official_website'),
		wikipedia_url: str('wikipedia_url'),
		wikidata_id: str('wikidata_id'),
		geonames_id: str('geonames_id'),
		settlement_type: str('settlement_type'),
		i18n,
		updated_at,
	};
}

function parseStoredNumber(v: unknown): number | null {
	if (v == null || v === '') return null;
	const n = typeof v === 'number' ? v : parseFloat(String(v));
	if (!Number.isFinite(n)) return null;
	return n;
}

/** Call after replacing `regions.json` on disk (e.g. backup import). */
export function invalidateRegionsCache(): void {
	cache = null;
}

function getPosts(): RegionPost[] {
	const mtime = fileMtime();
	if (cache && cache.mtime === mtime) return cache.posts;

	const raw = readRawStore();
	const posts: RegionPost[] = [];
	for (const row of raw.posts) {
		const p = normalizeRegionPost(row);
		if (p) posts.push(p);
	}
	cache = { posts, mtime };
	return posts;
}

function writeStore(posts: RegionPost[]) {
	ensureRegionsDir();

	const indexPosts = posts.filter((p) => p.level !== 'village');
	const villages = posts.filter((p) => p.level === 'village');

	// Write index (regions + municipalities) — always first so fileMtime() is fresh
	writeFileSync(
		REGIONS_INDEX,
		JSON.stringify({ posts: indexPosts }, null, '\t') + '\n',
		'utf8',
	);

	// Group villages by parent municipality id
	const grouped = new Map<string, RegionPost[]>();
	for (const v of villages) {
		if (!v.parent_id) continue;
		const arr = grouped.get(v.parent_id) ?? [];
		arr.push(v);
		grouped.set(v.parent_id, arr);
	}

	// Write per-municipality village files
	const writtenFiles = new Set<string>();
	for (const [muniId, muniVillages] of grouped) {
		const fname = `${muniId}.json`;
		writeFileSync(
			path.join(REGIONS_DIR, fname),
			JSON.stringify({ posts: muniVillages }, null, '\t') + '\n',
			'utf8',
		);
		writtenFiles.add(fname);
	}

	// Remove stale village files (e.g. municipality was deleted)
	try {
		for (const fname of readdirSync(REGIONS_DIR)) {
			if (!fname.endsWith('.json') || fname === 'index.json') continue;
			if (!writtenFiles.has(fname)) {
				try { unlinkSync(path.join(REGIONS_DIR, fname)); } catch { /* ignore */ }
			}
		}
	} catch { /* ignore */ }

	cache = { posts: [...posts], mtime: fileMtime() };
}

export function getRegionPostById(id: string): RegionPost | null {
	if (!isValidTourId(id)) return null;
	return getPosts().find((p) => p.id === id) ?? null;
}

/**
 * True if `taggedId` is `ancestorId` or is a municipality/village that sits under that ancestor
 * (used to show a “What to do” entry on a region/municipality/village page).
 */
export function isRegionPostUnderAncestor(taggedId: string, ancestorId: string): boolean {
	if (taggedId === ancestorId) return true;
	const byId = new Map(getPosts().map((p) => [p.id, p]));
	let cur: RegionPost | undefined = byId.get(taggedId);
	const seen = new Set<string>();
	while (cur?.parent_id && !seen.has(cur.id)) {
		seen.add(cur.id);
		if (cur.parent_id === ancestorId) return true;
		cur = byId.get(cur.parent_id);
	}
	return false;
}

/** Keep only ids that exist in regions.json (deduped, stable order). */
export function filterValidRegionIds(ids: string[]): string[] {
	if (!ids.length) return [];
	const valid = new Set(getPosts().map((p) => p.id));
	const out: string[] = [];
	const seen = new Set<string>();
	for (const raw of ids) {
		if (typeof raw !== 'string') continue;
		const id = raw.trim();
		if (!isValidTourId(id) || !valid.has(id) || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

export type RegionPlacePickerRow = {
	id: string;
	slug: string;
	level: RegionLevel;
	/** English title fallback for admin / contribute pickers */
	label: string;
};

export function listRegionsForWhatToDoPicker(): RegionPlacePickerRow[] {
	const out: RegionPlacePickerRow[] = [];
	for (const p of getPosts()) {
		const label = p.i18n.en?.title?.trim() || p.slug;
		out.push({ id: p.id, slug: p.slug, level: p.level, label });
	}
	out.sort((a, b) => {
		const la = REGION_LEVEL_IDS.indexOf(a.level);
		const lb = REGION_LEVEL_IDS.indexOf(b.level);
		if (la !== lb) return la - lb;
		return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
	});
	return out;
}

export function findRegionBySlug(slug: string): RegionPost | null {
	const s = slug.trim();
	if (!s) return null;
	return getPosts().find((p) => p.slug === s) ?? null;
}

function titleForLocale(p: RegionPost, locale: string): string {
	if (!isLocale(locale)) return '';
	return p.i18n[locale]?.title?.trim() ?? '';
}

function parentChain(post: RegionPost, byId: Map<string, RegionPost>): RegionPost[] {
	const chain: RegionPost[] = [];
	let cur: RegionPost | undefined = post;
	const seen = new Set<string>();
	while (cur?.parent_id && !seen.has(cur.id)) {
		seen.add(cur.id);
		const par = byId.get(cur.parent_id);
		if (!par) break;
		chain.unshift(par);
		cur = par;
	}
	return chain;
}

export function getRegionPublicRow(locale: string, slug: string): RegionPublicRow | null {
	if (!isLocale(locale)) return null;
	const post = findRegionBySlug(slug);
	if (!post) return null;
	const block = post.i18n[locale];
	if (!block?.title?.trim()) return null;

	const byId = new Map(getPosts().map((p) => [p.id, p]));
	const chain = parentChain(post, byId);
	const breadcrumbs: RegionPublicRow['breadcrumbs'] = chain.map((p) => ({
		slug: p.slug,
		title: titleForLocale(p, locale) || p.slug,
		level: p.level,
	}));

	const childLevel: RegionLevel | null =
		post.level === 'region' ? 'municipality' : post.level === 'municipality' ? 'village' : null;
	const children: RegionPublicRow['children'] = [];
	if (childLevel) {
		for (const c of getPosts()) {
			if (c.parent_id !== post.id || c.level !== childLevel) continue;
			const t = titleForLocale(c, locale);
			if (!t) continue;
			children.push({ slug: c.slug, title: t, level: c.level });
		}
		children.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
	}

	return {
		id: post.id,
		slug: post.slug,
		level: post.level,
		title: block.title.trim(),
		subtitle: block.subtitle,
		excerpt: block.excerpt.trim(),
		body: (block.body ?? '').trim(),
		seo_title: block.seo_title,
		seo_description: block.seo_description,
		image: post.image,
		gallery: [...post.gallery],
		location: post.location,
		population: post.population,
		area_km2: post.area_km2,
		elevation_m: post.elevation_m,
		admin_center_name: post.admin_center_name,
		iso_3166_2: post.iso_3166_2,
		official_code: post.official_code,
		official_website: post.official_website,
		wikipedia_url: post.wikipedia_url,
		wikidata_id: post.wikidata_id,
		geonames_id: post.geonames_id,
		settlement_type: post.settlement_type,
		updated_at: post.updated_at,
		breadcrumbs,
		children,
	};
}

export type RegionIndexCard = {
	slug: string;
	title: string;
	excerpt: string;
	image: string | null;
	gallery: string[];
	level: RegionLevel;
	subtitle: string | null;
};

export function listRegionIndexCards(locale: string, level?: RegionLevel): RegionIndexCard[] {
	if (!isLocale(locale)) return [];
	const posts = getPosts().filter((p) => (level ? p.level === level : true));
	const out: RegionIndexCard[] = [];
	for (const p of posts) {
		const block = p.i18n[locale];
		const title = block?.title?.trim();
		if (!title) continue;
		out.push({
			slug: p.slug,
			title,
			excerpt: block?.excerpt?.trim() ?? '',
			image: p.image,
			gallery: [...p.gallery],
			level: p.level,
			subtitle: block?.subtitle ?? null,
		});
	}
	out.sort((a, b) => {
		const la = REGION_LEVEL_IDS.indexOf(a.level);
		const lb = REGION_LEVEL_IDS.indexOf(b.level);
		if (la !== lb) return la - lb;
		return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
	});
	return out;
}

export function listAllRegionsAdmin(): AdminRegionListItem[] {
	return [...getPosts()]
		.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: 'base' }))
		.map((p) => ({
			id: p.id,
			slug: p.slug,
			level: p.level,
			parent_id: p.parent_id,
			titles: {
				en: p.i18n.en?.title ?? '',
				ka: p.i18n.ka?.title ?? '',
				ru: p.i18n.ru?.title ?? '',
			},
			locales: LOCALES.filter((l) => !!p.i18n[l]?.title?.trim()),
		}));
}

export function listRegionMapMarkers(locale: string): TourMapMarker[] {
	if (!isLocale(locale)) return [];
	const seg = 'regions';
	const out: TourMapMarker[] = [];
	for (const p of getPosts()) {
		const loc = p.location;
		if (!loc) continue;
		const block = p.i18n[locale];
		const title = block?.title?.trim();
		if (!title) continue;
		const excerpt = block?.excerpt?.trim() ?? '';
		const cover = tourCoverImageUrl({ image: p.image, gallery: p.gallery });
		const mapIconKey =
			p.level === 'region' ? 'geo-region' : p.level === 'municipality' ? 'geo-municipality' : 'geo-village';
		out.push({
			slug: p.slug,
			title,
			lat: loc.lat,
			lng: loc.lng,
			label: loc.label,
			href: `/${locale}/${seg}/${p.slug}`,
			kind: 'regions',
			mapIconKey,
			coverUrl: cover ?? null,
			excerpt,
			tourCategory: null,
			whatDoCategoryIds: [],
		});
	}
	return out;
}

/** For admin parent `<select>`: optional filter by level */
export function listRegionsForParentSelect(
	wantParentLevel: RegionLevel,
): { id: string; slug: string; label: string }[] {
	const posts = getPosts().filter((p) => p.level === wantParentLevel);
	return posts
		.map((p) => ({
			id: p.id,
			slug: p.slug,
			label: p.i18n.en?.title?.trim() || p.slug,
		}))
		.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function isRegionSlugTaken(slug: string, exceptId?: string): boolean {
	const s = slug.trim();
	return getPosts().some((p) => p.slug === s && p.id !== exceptId);
}

export function validateRegionI18nAndSlug(
	slug: string,
	i18n: Partial<Record<Locale, RegionLocaleBlock>>,
): { ok: true } | { ok: false; error: string } {
	if (!isValidSlug(slug)) {
		return { ok: false, error: 'Invalid slug (use lowercase letters, numbers, hyphens)' };
	}

	const filledLocales = LOCALES.filter((l) => {
		const b = i18n[l];
		if (!b) return false;
		return !!(b.title?.trim() && b.excerpt?.trim());
	});
	if (filledLocales.length === 0) {
		return {
			ok: false,
			error: 'Add at least one language with title and excerpt filled in',
		};
	}

	for (const loc of LOCALES) {
		const b = i18n[loc];
		if (!b) continue;
		const t = b.title?.trim() ?? '';
		const e = b.excerpt?.trim() ?? '';
		if ((t || e) && !(t && e)) {
			return {
				ok: false,
				error: `Incomplete ${loc}: fill both title and excerpt (or clear both for that language)`,
			};
		}
	}

	return { ok: true };
}

export type SaveRegionPostInput = {
	id?: string;
	slug: string;
	level: RegionLevel;
	parent_id: string | null;
	image?: string | null;
	gallery?: string[];
	location?: TourLocation | null;
	population?: number | null;
	area_km2?: number | null;
	elevation_m?: number | null;
	admin_center_name?: string | null;
	iso_3166_2?: string | null;
	official_code?: string | null;
	official_website?: string | null;
	wikipedia_url?: string | null;
	wikidata_id?: string | null;
	geonames_id?: string | null;
	settlement_type?: string | null;
	i18n: Partial<Record<Locale, RegionLocaleBlock>>;
	mode: 'create' | 'update';
};

function validateParentForLevel(
	level: RegionLevel,
	parent_id: string | null,
	posts: RegionPost[],
): { ok: true } | { ok: false; error: string } {
	if (level === 'region') {
		if (parent_id !== null) {
			return { ok: false, error: 'A region must not have a parent' };
		}
		return { ok: true };
	}
	if (!parent_id || !isValidTourId(parent_id)) {
		return { ok: false, error: 'Choose a parent for this municipality or village' };
	}
	const parent = posts.find((p) => p.id === parent_id);
	if (!parent) {
		return { ok: false, error: 'Parent place not found' };
	}
	if (level === 'municipality' && parent.level !== 'region') {
		return { ok: false, error: 'A municipality must belong to a region' };
	}
	if (level === 'village' && parent.level !== 'municipality') {
		return { ok: false, error: 'A village must belong to a municipality' };
	}
	return { ok: true };
}

function countDirectChildren(posts: RegionPost[], id: string): number {
	return posts.filter((p) => p.parent_id === id).length;
}

export function saveRegionPost(
	input: SaveRegionPostInput,
): { ok: true } | { ok: false; error: string } {
	const base = validateRegionI18nAndSlug(input.slug, input.i18n);
	if (!base.ok) return base;

	const posts = [...getPosts()];
	const parentCheck = validateParentForLevel(input.level, input.parent_id, posts);
	if (!parentCheck.ok) return parentCheck;

	const now = Date.now();
	const galleryVal = normalizeTourGalleryInput(input.gallery ?? []);

	const cleanI18n: Partial<Record<Locale, RegionLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const b = input.i18n[loc];
		if (!b) continue;
		const t = b.title.trim();
		const e = b.excerpt.trim();
		if (!t || !e) continue;
		const st = b.subtitle?.trim();
		cleanI18n[loc] = {
			title: t,
			subtitle: st ? st : null,
			excerpt: e,
			seo_title: b.seo_title?.trim() ? b.seo_title.trim() : null,
			seo_description: b.seo_description?.trim() ? b.seo_description.trim() : null,
			body: (b.body ?? '').trim(),
		};
	}

	if (input.mode === 'create') {
		if (posts.some((p) => p.slug === input.slug)) {
			return { ok: false, error: 'A place with this slug already exists' };
		}
		const createImage =
			input.image !== undefined ? (typeof input.image === 'string' && input.image.trim() ? input.image.trim() : null) : null;
		const createLocation = input.location === undefined ? null : input.location;
		posts.push({
			id: randomUUID(),
			slug: input.slug,
			level: input.level,
			parent_id: input.level === 'region' ? null : input.parent_id,
			image: createImage,
			gallery: galleryVal,
			location: createLocation,
			population: input.population === undefined ? null : input.population,
			area_km2: input.area_km2 === undefined ? null : input.area_km2,
			elevation_m: input.elevation_m === undefined ? null : input.elevation_m,
			admin_center_name: trimNullable(input.admin_center_name),
			iso_3166_2: trimNullable(input.iso_3166_2),
			official_code: trimNullable(input.official_code),
			official_website: trimNullable(input.official_website),
			wikipedia_url: trimNullable(input.wikipedia_url),
			wikidata_id: trimNullable(input.wikidata_id),
			geonames_id: trimNullable(input.geonames_id),
			settlement_type: trimNullable(input.settlement_type),
			i18n: cleanI18n,
			updated_at: now,
		});
		writeStore(posts);
		return { ok: true };
	}

	const id = input.id;
	if (!id || !isValidTourId(id)) {
		return { ok: false, error: 'Missing or invalid place id' };
	}
	const idx = posts.findIndex((p) => p.id === id);
	if (idx === -1) {
		return { ok: false, error: 'Place not found' };
	}
	if (posts.some((p) => p.slug === input.slug && p.id !== id)) {
		return { ok: false, error: 'Another place already uses this slug' };
	}

	const prev = posts[idx];

	/** Block level change if it would break tree */
	const nextLevel = input.level;
	if (prev.level !== nextLevel) {
		return { ok: false, error: 'Changing the level after creation is not supported' };
	}

	const nextParent = nextLevel === 'region' ? null : input.parent_id;
	if (nextParent && nextParent === id) {
		return { ok: false, error: 'A place cannot be its own parent' };
	}
	const parentOk = validateParentForLevel(nextLevel, nextParent, posts.filter((p) => p.id !== id));
	if (!parentOk.ok) return parentOk;

	/** Prevent reparenting under a descendant */
	if (nextParent) {
		let walk: string | null = nextParent;
		const seen = new Set<string>();
		while (walk && !seen.has(walk)) {
			seen.add(walk);
			if (walk === id) {
				return { ok: false, error: 'Cannot set parent to a descendant of this place' };
			}
			const node = posts.find((p) => p.id === walk);
			walk = node?.parent_id ?? null;
		}
	}

	const nextImage =
		input.image !== undefined
			? typeof input.image === 'string' && input.image.trim()
				? input.image.trim()
				: null
			: prev.image;
	const nextGallery = input.gallery !== undefined ? galleryVal : prev.gallery;
	const nextLocation = input.location === undefined ? prev.location : input.location;

	posts[idx] = {
		...prev,
		slug: input.slug,
		level: nextLevel,
		parent_id: nextParent,
		image: nextImage,
		gallery: nextGallery,
		location: nextLocation,
		population: input.population === undefined ? prev.population : input.population,
		area_km2: input.area_km2 === undefined ? prev.area_km2 : input.area_km2,
		elevation_m: input.elevation_m === undefined ? prev.elevation_m : input.elevation_m,
		admin_center_name:
			input.admin_center_name === undefined ? prev.admin_center_name : trimNullable(input.admin_center_name),
		iso_3166_2: input.iso_3166_2 === undefined ? prev.iso_3166_2 : trimNullable(input.iso_3166_2),
		official_code:
			input.official_code === undefined ? prev.official_code : trimNullable(input.official_code),
		official_website:
			input.official_website === undefined ? prev.official_website : trimNullable(input.official_website),
		wikipedia_url:
			input.wikipedia_url === undefined ? prev.wikipedia_url : trimNullable(input.wikipedia_url),
		wikidata_id: input.wikidata_id === undefined ? prev.wikidata_id : trimNullable(input.wikidata_id),
		geonames_id: input.geonames_id === undefined ? prev.geonames_id : trimNullable(input.geonames_id),
		settlement_type:
			input.settlement_type === undefined ? prev.settlement_type : trimNullable(input.settlement_type),
		i18n: cleanI18n,
		updated_at: now,
	};

	writeStore(posts);
	return { ok: true };
}

function trimNullable(v: string | null | undefined): string | null {
	if (v === undefined) return null;
	const t = String(v).trim();
	return t ? t : null;
}

export function deleteRegionPost(id: string): { ok: true } | { ok: false; error: string } {
	if (!isValidTourId(id)) {
		return { ok: false, error: 'Invalid id' };
	}
	const posts = getPosts();
	const idx = posts.findIndex((p) => p.id === id);
	if (idx === -1) {
		return { ok: false, error: 'Place not found' };
	}
	if (countDirectChildren(posts, id) > 0) {
		return { ok: false, error: 'Remove or reassign child municipalities or villages first' };
	}
	const next = posts.filter((p) => p.id !== id);
	writeStore(next);
	return { ok: true };
}

export function parseOptionalNumberField(raw: string): number | null {
	const s = raw.trim();
	if (!s) return null;
	const n = parseFloat(s.replace(/,/g, ''));
	if (!Number.isFinite(n)) return null;
	return n;
}

/** Used by admin-data-backup to export all posts as a single flat bundle. */
export function getRegionsBackupPayload(): { posts: RegionPost[] } {
	return { posts: getPosts() };
}

/** Used by admin-data-backup to restore all posts from a flat bundle. */
export function applyRegionsBackupPayload(payload: { posts: unknown[] }): void {
	const posts: RegionPost[] = [];
	for (const row of payload.posts) {
		const p = normalizeRegionPost(row);
		if (p) posts.push(p);
	}
	writeStore(posts);
}
