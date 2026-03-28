import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ContactSocialLinks } from './contact-social-links';
import { normalizeSocialLinksFromJson, trimSocialLinks } from './contact-social-links';
import type { Locale } from './strings';
import type { GuideSpecialtyId } from './guide-specialties';
import { normalizeGuideSpecialtiesFromRaw } from './guide-specialties';
import { filterValidRegionIds } from './regions-db';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'guides.json');

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

export type GuideLocaleBlock = {
	/** Guide's name or business name in this language */
	name: string;
	/** Short tagline (e.g. "Expert Tbilisi walking guide, 10 years experience") */
	tagline: string;
	/** Full bio in Markdown */
	bio: string;
	seo_title: string | null;
	seo_description: string | null;
};

export type GuidePost = {
	id: string;
	slug: string;
	/** Main profile/cover photo URL */
	profile_photo: string | null;
	/** Additional photo gallery */
	gallery: string[];
	/** Contact and social links (shared across all locales) */
	social_links: ContactSocialLinks;
	/** Languages the guide speaks, e.g. ['en', 'ka', 'de'] */
	languages_spoken: string[];
	/** Years of experience (optional) */
	years_experience: number | null;
	/** City or region the guide is based in */
	base_location: string | null;
	/** Linked region/municipality/village post ids */
	place_ids: string[];
	/** Starting price (free text, e.g. "$50/day") */
	price_from: string | null;
	/** Admin-only verified badge */
	verified: boolean;
	/** Guide specialties (multi-select) */
	specialties: GuideSpecialtyId[];
	i18n: Partial<Record<Locale, GuideLocaleBlock>>;
	updated_at: number;
	author_user_id: string | null;
	author_email: string | null;
};

export type AdminGuideListItem = {
	id: string;
	slug: string;
	names: Partial<Record<Locale, string>>;
	locales: Locale[];
	verified: boolean;
	specialties: GuideSpecialtyId[];
	author_email: string | null;
	updated_at: number;
};

type StoreFile = { guides: GuidePost[] };

let cached: GuidePost[] | null = null;
let cachedMtime = 0;

export function invalidateGuidesCache(): void {
	cached = null;
	cachedMtime = 0;
}

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function fileMtime(): number {
	if (!existsSync(STORE_FILE)) return 0;
	try {
		return statSync(STORE_FILE).mtimeMs;
	} catch {
		return 0;
	}
}

function readAll(): GuidePost[] {
	ensureDataDir();
	if (!existsSync(STORE_FILE)) {
		writeFileSync(STORE_FILE, `${JSON.stringify({ guides: [] }, null, 2)}\n`, 'utf8');
		return [];
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreFile;
		if (!Array.isArray(raw.guides)) return [];
		return raw.guides
			.filter((g): g is GuidePost => typeof g?.id === 'string')
			.map(normalizeGuidePost);
	} catch {
		return [];
	}
}

function normalizeGuidePost(raw: GuidePost): GuidePost {
	const i18n: Partial<Record<Locale, GuideLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const b = raw.i18n?.[loc];
		if (!b) continue;
		const name = String(b.name ?? '').trim();
		const tagline = String(b.tagline ?? '').trim();
		if (!name && !tagline && !b.bio?.trim()) continue;
		i18n[loc] = {
			name,
			tagline,
			bio: b.bio ?? '',
			seo_title: b.seo_title?.trim() || null,
			seo_description: b.seo_description?.trim() || null,
		};
	}
	const socialRaw = normalizeSocialLinksFromJson(raw.social_links);

	const langs = Array.isArray(raw.languages_spoken)
		? (raw.languages_spoken as unknown[])
				.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
				.map((x) => x.trim())
		: [];

	return {
		id: raw.id,
		slug: raw.slug,
		profile_photo: raw.profile_photo?.trim() || null,
		gallery: Array.isArray(raw.gallery) ? (raw.gallery as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [],
		social_links: socialRaw ?? {},
		languages_spoken: langs,
		years_experience:
			typeof raw.years_experience === 'number' && Number.isFinite(raw.years_experience)
				? raw.years_experience
				: null,
		base_location: raw.base_location?.trim() || null,
		place_ids: filterValidRegionIds(Array.isArray(raw.place_ids) ? (raw.place_ids as unknown[]).filter((x): x is string => typeof x === 'string') : []),
		price_from: raw.price_from?.trim() || null,
		verified: raw.verified === true,
		specialties: normalizeGuideSpecialtiesFromRaw(raw.specialties),
		i18n,
		updated_at: typeof raw.updated_at === 'number' ? raw.updated_at : 0,
		author_user_id: raw.author_user_id?.trim() || null,
		author_email: raw.author_email?.trim() || null,
	};
}

export function getGuides(): GuidePost[] {
	const m = fileMtime();
	if (cached === null || m > cachedMtime) {
		cached = readAll();
		cachedMtime = m;
	}
	return cached;
}

function writeAll(guides: GuidePost[]) {
	ensureDataDir();
	writeFileSync(STORE_FILE, `${JSON.stringify({ guides }, null, 2)}\n`, 'utf8');
	cached = [...guides];
	cachedMtime = fileMtime();
}

export function listGuidesForLocale(locale: Locale): { slug: string; name: string; tagline: string; profile_photo: string | null; specialties: GuideSpecialtyId[]; base_location: string | null; verified: boolean; id: string }[] {
	return getGuides()
		.filter((g) => g.i18n[locale]?.name?.trim())
		.map((g) => ({
			id: g.id,
			slug: g.slug,
			name: g.i18n[locale]!.name.trim(),
			tagline: g.i18n[locale]!.tagline ?? '',
			profile_photo: g.profile_photo,
			specialties: g.specialties,
			base_location: g.base_location,
			verified: g.verified,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function getGuideBySlug(slug: string): GuidePost | null {
	return getGuides().find((g) => g.slug === slug) ?? null;
}

export function getGuideById(id: string): GuidePost | null {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	return getGuides().find((g) => g.id === id) ?? null;
}

export function isGuideSlugUsedByAnother(slug: string, exceptId: string | null): boolean {
	return getGuides().some((g) => g.slug === slug && g.id !== exceptId);
}

export function listAllGuidesAdmin(): AdminGuideListItem[] {
	return getGuides()
		.map((g) => {
			const locales = LOCALES.filter((loc) => g.i18n[loc]?.name?.trim());
			const names: Partial<Record<Locale, string>> = {};
			for (const loc of locales) names[loc] = g.i18n[loc]!.name.trim();
			return {
				id: g.id,
				slug: g.slug,
				names,
				locales,
				verified: g.verified,
				specialties: g.specialties,
				author_email: g.author_email,
				updated_at: g.updated_at,
			};
		})
		.sort((a, b) => b.updated_at - a.updated_at);
}

export function filterGuideRowsForAdmin(rows: AdminGuideListItem[], q: string): AdminGuideListItem[] {
	const n = q.trim().toLowerCase();
	if (!n) return rows;
	const terms = n.split(/\s+/).filter(Boolean);
	return rows.filter((row) => {
		const hay = [row.slug, row.names.en, row.names.ka, row.names.ru, row.author_email ?? '']
			.join(' ')
			.toLowerCase();
		return terms.every((t) => hay.includes(t));
	});
}

export function isValidGuideId(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export type SaveGuidePostInput = {
	id?: string;
	mode: 'create' | 'update';
	slug: string;
	profile_photo: string | null;
	gallery: string[];
	social_links: ContactSocialLinks;
	languages_spoken: string[];
	years_experience: number | null;
	base_location: string | null;
	place_ids: string[];
	price_from: string | null;
	verified?: boolean;
	specialties: GuideSpecialtyId[];
	i18n: Partial<Record<Locale, GuideLocaleBlock>>;
	author_user_id?: string | null;
	author_email?: string | null;
};

export function validateGuideI18nAndSlug(
	slug: string,
	i18n: Partial<Record<Locale, GuideLocaleBlock>>,
): { ok: true; slug: string } | { ok: false; error: string } {
	if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 120) {
		return { ok: false, error: 'Invalid slug (lowercase letters, numbers, hyphens; max 120 chars)' };
	}
	const hasLocale = LOCALES.some((loc) => {
		const b = i18n[loc];
		return b?.name?.trim() && b?.tagline?.trim();
	});
	if (!hasLocale) {
		return { ok: false, error: 'At least one language needs a name and tagline' };
	}
	return { ok: true, slug };
}

export function saveGuidePost(
	input: SaveGuidePostInput,
): { ok: true; id: string } | { ok: false; error: string } {
	const slugTrim = input.slug.trim();
	const validationResult = validateGuideI18nAndSlug(slugTrim, input.i18n);
	if (!validationResult.ok) return validationResult;

	const list = [...getGuides()];
	const now = Date.now();

	if (input.mode === 'update') {
		if (!input.id) return { ok: false, error: 'Missing id for update' };
		const idx = list.findIndex((g) => g.id === input.id);
		if (idx === -1) return { ok: false, error: 'Guide not found' };
		const existing = list[idx];
		if (isGuideSlugUsedByAnother(slugTrim, existing.id)) {
			return { ok: false, error: 'This slug is already used by another guide' };
		}
		list[idx] = {
			...existing,
			slug: slugTrim,
			profile_photo: input.profile_photo,
			gallery: input.gallery,
			social_links: trimSocialLinks(input.social_links),
			languages_spoken: input.languages_spoken,
			years_experience: input.years_experience,
			base_location: input.base_location,
			place_ids: filterValidRegionIds(input.place_ids),
			price_from: input.price_from,
			verified: input.verified !== undefined ? input.verified : existing.verified,
			specialties: input.specialties,
			i18n: input.i18n,
			updated_at: now,
			...(input.author_user_id !== undefined ? { author_user_id: input.author_user_id } : {}),
			...(input.author_email !== undefined ? { author_email: input.author_email } : {}),
		};
		writeAll(list);
		return { ok: true, id: existing.id };
	}

	if (isGuideSlugUsedByAnother(slugTrim, null)) {
		return { ok: false, error: 'This slug is already used by another guide' };
	}
	const newPost: GuidePost = {
		id: randomUUID(),
		slug: slugTrim,
		profile_photo: input.profile_photo,
		gallery: input.gallery,
		social_links: trimSocialLinks(input.social_links),
		languages_spoken: input.languages_spoken,
		years_experience: input.years_experience,
		base_location: input.base_location,
		place_ids: filterValidRegionIds(input.place_ids),
		price_from: input.price_from,
		verified: input.verified ?? false,
		specialties: input.specialties,
		i18n: input.i18n,
		updated_at: now,
		author_user_id: input.author_user_id ?? null,
		author_email: input.author_email ?? null,
	};
	list.push(newPost);
	writeAll(list);
	return { ok: true, id: newPost.id };
}

export function deleteGuideById(id: string): { ok: true } | { ok: false; error: string } {
	const list = getGuides();
	const idx = list.findIndex((g) => g.id === id);
	if (idx === -1) return { ok: false, error: 'Guide not found' };
	writeAll(list.filter((_, i) => i !== idx));
	return { ok: true };
}

export function normalizeGuideGalleryInput(input: unknown): string[] {
	if (input == null) return [];
	if (typeof input === 'string') {
		return input
			.split(/[\r\n,]+/)
			.map((s) => s.replace(/\uFEFF/g, '').trim())
			.filter(Boolean)
			.slice(0, 30);
	}
	if (Array.isArray(input)) {
		return (input as unknown[])
			.filter((x): x is string => typeof x === 'string')
			.map((s) => s.replace(/\uFEFF/g, '').trim())
			.filter(Boolean)
			.slice(0, 30);
	}
	return [];
}
