import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Locale } from './strings';
import { ui } from './strings';
import { isValidSlug } from './tours-db';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'footer.json');

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

export type FooterLink = {
	id: string;
	order: number;
	/**
	 * Path after the locale prefix, no leading slash.
	 * Examples: `about`, `tours`, `tours/tbilisi-old-town`
	 */
	internal_path: string | null;
	/** https://…, http://…, or mailto:… */
	external_url: string | null;
	title_en: string;
	title_ka: string;
	title_ru: string;
};

export type FooterBlurb = Record<Locale, string>;

/** Short per-locale strings (brand line, headings, tagline); empty = use built-in default on the site. */
export type FooterMainText = Record<Locale, string>;

export type FooterConfig = {
	updated_at: number;
	/** Optional: replaces “TRAVELGEORGIA.GE” next to the logo when non-empty. */
	brand_title: FooterMainText;
	/** Optional: line under the logo; empty uses ui[locale].footerAboutText */
	about_text: FooterMainText;
	/** Optional column headings; empty uses ui footerColExplore / footerColCompany */
	explore_heading: FooterMainText;
	company_heading: FooterMainText;
	/** Main grid — Explore column; empty array = built-in Home, Tours, … */
	explore_links: FooterLink[];
	/** Main grid — Company column; empty array = built-in Policy, Contribute, … */
	company_links: FooterLink[];
	links: FooterLink[];
	/** Markdown under the extra link row on every public page. */
	blurb: FooterBlurb;
};

export type FooterNavEntry =
	| { kind: 'internal'; path: string; title: string }
	| { kind: 'external'; url: string; title: string };

let cached: FooterConfig | null = null;
let cachedMtimeMs = 0;

/** Call after replacing `footer.json` on disk (e.g. backup import). */
export function invalidateFooterCache(): void {
	cached = null;
	cachedMtimeMs = 0;
}

function footerFileMtimeMs(): number {
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

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidLinkId(id: string): boolean {
	return UUID_RE.test(id);
}

function isValidInternalPath(s: string): boolean {
	const t = s.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
	if (t === '') return true; // site home
	const segments = t.split('/').filter(Boolean);
	return segments.length > 0 && segments.every((seg) => isValidSlug(seg));
}

function isValidExternalUrl(s: string): boolean {
	const t = s.trim();
	if (!t) return false;
	if (t.toLowerCase().startsWith('mailto:')) {
		return t.length > 7;
	}
	try {
		const u = new URL(t);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

function normalizeBlurb(raw: unknown): FooterBlurb {
	const out: FooterBlurb = { en: '', ka: '', ru: '' };
	if (!raw || typeof raw !== 'object') return out;
	const o = raw as Record<string, unknown>;
	for (const loc of LOCALES) {
		out[loc] = String(o[loc] ?? '');
	}
	return out;
}

function normalizeMainText(raw: unknown): FooterMainText {
	const out: FooterMainText = { en: '', ka: '', ru: '' };
	if (!raw || typeof raw !== 'object') return out;
	const o = raw as Record<string, unknown>;
	for (const loc of LOCALES) {
		out[loc] = String(o[loc] ?? '');
	}
	return out;
}

function normalizeLink(raw: unknown): FooterLink | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' && isValidLinkId(o.id) ? o.id : randomUUID();
	const orderRaw = o.order;
	const order = typeof orderRaw === 'number' && Number.isFinite(orderRaw) ? orderRaw : 0;
	const ip = o.internal_path;
	const eu = o.external_url;
	let internal_path: string | null = null;
	const external_url =
		eu == null || String(eu).trim() === '' ? null : String(eu).trim();
	if (ip != null) {
		internal_path = String(ip).trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
	}
	return {
		id,
		order,
		internal_path,
		external_url,
		title_en: String(o.title_en ?? ''),
		title_ka: String(o.title_ka ?? ''),
		title_ru: String(o.title_ru ?? ''),
	};
}

function normalizeLinksArray(raw: unknown): FooterLink[] {
	const links: FooterLink[] = [];
	if (!Array.isArray(raw)) return links;
	for (const item of raw) {
		const L = normalizeLink(item);
		if (L) links.push(L);
	}
	return links;
}

const emptyMainText = (): FooterMainText => ({ en: '', ka: '', ru: '' });

function readStore(): FooterConfig {
	const empty = (): FooterConfig => ({
		updated_at: Date.now(),
		brand_title: emptyMainText(),
		about_text: emptyMainText(),
		explore_heading: emptyMainText(),
		company_heading: emptyMainText(),
		explore_links: [],
		company_links: [],
		links: [],
		blurb: { en: '', ka: '', ru: '' },
	});
	if (!existsSync(STORE_FILE)) {
		return empty();
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Record<string, unknown>;
		const linksRaw = raw.links;
		const links: FooterLink[] = [];
		if (Array.isArray(linksRaw)) {
			for (const item of linksRaw) {
				const L = normalizeLink(item);
				if (L) links.push(L);
			}
		}
		return {
			updated_at: typeof raw.updated_at === 'number' ? raw.updated_at : Date.now(),
			brand_title: normalizeMainText(raw.brand_title),
			about_text: normalizeMainText(raw.about_text),
			explore_heading: normalizeMainText(raw.explore_heading),
			company_heading: normalizeMainText(raw.company_heading),
			explore_links: normalizeLinksArray(raw.explore_links),
			company_links: normalizeLinksArray(raw.company_links),
			links,
			blurb: normalizeBlurb(raw.blurb),
		};
	} catch {
		return empty();
	}
}

function writeStore(cfg: FooterConfig) {
	ensureDataDir();
	writeFileSync(STORE_FILE, JSON.stringify(cfg, null, 2), 'utf8');
	cached = {
		...cfg,
		links: [...cfg.links],
		explore_links: [...cfg.explore_links],
		company_links: [...cfg.company_links],
	};
	try {
		cachedMtimeMs = statSync(STORE_FILE).mtimeMs;
	} catch {
		cachedMtimeMs = Date.now();
	}
}

function cloneFooterSnapshot(c: FooterConfig): FooterConfig {
	return {
		updated_at: c.updated_at,
		brand_title: { ...c.brand_title },
		about_text: { ...c.about_text },
		explore_heading: { ...c.explore_heading },
		company_heading: { ...c.company_heading },
		explore_links: [...c.explore_links],
		company_links: [...c.company_links],
		links: [...c.links],
		blurb: { ...c.blurb },
	};
}

export function getFooterConfig(): FooterConfig {
	if (!existsSync(STORE_FILE)) {
		cached = readStore();
		cachedMtimeMs = 0;
		return cloneFooterSnapshot(cached);
	}
	const mtime = footerFileMtimeMs();
	if (cached === null || mtime > cachedMtimeMs) {
		cached = readStore();
		cachedMtimeMs = mtime;
	}
	return cloneFooterSnapshot(cached);
}

function pickTitle(link: FooterLink, locale: Locale): string {
	const map: Record<Locale, string> = {
		en: link.title_en,
		ka: link.title_ka,
		ru: link.title_ru,
	};
	const direct = map[locale]?.trim();
	if (direct) return direct;
	if (link.title_en.trim()) return link.title_en.trim();
	if (link.title_ka.trim()) return link.title_ka.trim();
	return link.title_ru.trim();
}

function sortFooterLinks(list: FooterLink[]): FooterLink[] {
	return [...list].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.id.localeCompare(b.id);
	});
}

function linksToNav(sortedLinks: FooterLink[], locale: Locale): FooterNavEntry[] {
	const out: FooterNavEntry[] = [];
	for (const link of sortedLinks) {
		const title = pickTitle(link, locale);
		if (!title) continue;
		const hasExternal = link.external_url != null && isValidExternalUrl(link.external_url);
		const hasInternal = link.internal_path !== null;
		if (hasExternal && !hasInternal) {
			out.push({ kind: 'external', url: link.external_url!.trim(), title });
		} else if (hasInternal) {
			const p = link.internal_path!.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
			if (!isValidInternalPath(p)) continue;
			out.push({ kind: 'internal', path: p, title });
		}
	}
	return out;
}

function builtInExploreNav(locale: Locale): FooterNavEntry[] {
	const t = ui[locale];
	return [
		{ kind: 'internal', path: '', title: t.home },
		{ kind: 'internal', path: 'tours', title: t.tours },
		{ kind: 'internal', path: 'what-to-do', title: t.whatToDo },
		{ kind: 'internal', path: 'regions', title: t.regions },
		{ kind: 'internal', path: 'map', title: t.map },
		{ kind: 'internal', path: 'search', title: t.searchButton },
	];
}

function builtInCompanyNav(locale: Locale): FooterNavEntry[] {
	const t = ui[locale];
	return [
		{ kind: 'internal', path: 'policy', title: t.footerPolicy },
		{ kind: 'internal', path: 'contribute', title: t.contribute },
		{ kind: 'internal', path: 'contact', title: t.contactPageTitle },
		{ kind: 'internal', path: 'login', title: t.login },
		{ kind: 'internal', path: 'register', title: t.register },
	];
}

/** Main footer “Explore” column; custom links from `footer.json`, or built-in defaults when empty. */
export function getFooterExploreNavForLocale(locale: Locale): FooterNavEntry[] {
	const { explore_links } = getFooterConfig();
	if (!explore_links.length) return builtInExploreNav(locale);
	return linksToNav(sortFooterLinks(explore_links), locale);
}

/** Main footer “Company” column; custom links from `footer.json`, or built-in defaults when empty. */
export function getFooterCompanyNavForLocale(locale: Locale): FooterNavEntry[] {
	const { company_links } = getFooterConfig();
	if (!company_links.length) return builtInCompanyNav(locale);
	return linksToNav(sortFooterLinks(company_links), locale);
}

/** Optional brand line next to the logo; `null` → show default TRAVELGEORGIA.GE. */
export function getFooterBrandLine(locale: Locale): string | null {
	const v = getFooterConfig().brand_title[locale]?.trim() ?? '';
	return v || null;
}

/** Optional Markdown under the logo; empty → use site translation `footerAboutText`. */
export function getFooterAboutMarkdown(locale: Locale): string {
	return getFooterConfig().about_text[locale]?.trim() ?? '';
}

export function getFooterExploreHeading(locale: Locale): string | null {
	const v = getFooterConfig().explore_heading[locale]?.trim() ?? '';
	return v || null;
}

export function getFooterCompanyHeading(locale: Locale): string | null {
	const v = getFooterConfig().company_heading[locale]?.trim() ?? '';
	return v || null;
}

/** Navigation entries for the optional row below the main grid (extra links + blurb). */
export function getFooterNavForLocale(locale: Locale): FooterNavEntry[] {
	const { links } = getFooterConfig();
	return linksToNav(sortFooterLinks(links), locale);
}

export function getFooterBlurbMarkdown(locale: Locale): string {
	return getFooterConfig().blurb[locale]?.trim() ?? '';
}

export type SaveFooterPayload = {
	brand_title?: Partial<Record<Locale, string>>;
	about_text?: Partial<Record<Locale, string>>;
	explore_heading?: Partial<Record<Locale, string>>;
	company_heading?: Partial<Record<Locale, string>>;
	explore_links?: Array<{
		id?: string;
		order: number;
		internal_path?: string | null;
		external_url?: string | null;
		title_en?: string;
		title_ka?: string;
		title_ru?: string;
	}>;
	company_links?: Array<{
		id?: string;
		order: number;
		internal_path?: string | null;
		external_url?: string | null;
		title_en?: string;
		title_ka?: string;
		title_ru?: string;
	}>;
	links: Array<{
		id?: string;
		order: number;
		internal_path?: string | null;
		external_url?: string | null;
		title_en?: string;
		title_ka?: string;
		title_ru?: string;
	}>;
	blurb?: Partial<Record<Locale, string>>;
};

function parseLinkRows(
	rawLinks: unknown,
	rowPrefix: string,
): { ok: true; links: FooterLink[] } | { ok: false; error: string } {
	if (!Array.isArray(rawLinks)) {
		return { ok: false, error: `${rowPrefix} must be an array` };
	}
	const links: FooterLink[] = [];
	let outIdx = 0;
	for (let idx = 0; idx < rawLinks.length; idx++) {
		const raw = rawLinks[idx];
		if (!raw || typeof raw !== 'object') continue;
		const rowLabel = `${rowPrefix} row ${idx + 1}`;
		const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : outIdx;
		const internalStr = raw.internal_path == null ? '' : String(raw.internal_path).trim();
		const externalStr = raw.external_url == null ? '' : String(raw.external_url).trim();
		if (internalStr && externalStr) {
			return { ok: false, error: `${rowLabel}: use either internal path or external URL, not both` };
		}
		const kind: 'internal' | 'external' = externalStr ? 'external' : 'internal';

		let ip: string | null = null;
		let eu: string | null = externalStr ? externalStr : null;

		if (kind === 'internal') {
			ip =
				internalStr === ''
					? ''
					: internalStr.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
		}

		const title_en = String(raw.title_en ?? '').trim();
		const title_ka = String(raw.title_ka ?? '').trim();
		const title_ru = String(raw.title_ru ?? '').trim();

		const hasTarget = kind === 'internal' ? true : !!eu;
		const hasTitle = !!(title_en || title_ka || title_ru);
		if (!hasTarget && !hasTitle) continue;
		if (!hasTarget) {
			return { ok: false, error: `${rowLabel}: add an external URL` };
		}
		if (!hasTitle) {
			return { ok: false, error: `${rowLabel}: add at least one title (EN, KA, or RU)` };
		}

		if (kind === 'internal' && !isValidInternalPath(ip!)) {
			return { ok: false, error: `${rowLabel}: invalid internal path (use empty for home)` };
		}
		if (kind === 'external' && eu && !isValidExternalUrl(eu)) {
			return { ok: false, error: `${rowLabel}: invalid external URL (use http(s):// or mailto:)` };
		}

		const id =
			typeof raw.id === 'string' && isValidLinkId(raw.id) ? raw.id : randomUUID();
		links.push({
			id,
			order,
			internal_path: ip,
			external_url: eu,
			title_en,
			title_ka,
			title_ru,
		});
		outIdx++;
	}
	return { ok: true, links };
}

function mergeMainText(prev: FooterMainText, patch: unknown): FooterMainText {
	const out: FooterMainText = { ...prev };
	if (patch && typeof patch === 'object') {
		const o = patch as Record<string, unknown>;
		for (const loc of LOCALES) {
			const v = o[loc];
			if (v !== undefined) out[loc] = String(v ?? '');
		}
	}
	return out;
}

export function saveFooterFromPayload(
	payload: SaveFooterPayload,
): { ok: true } | { ok: false; error: string } {
	if (!payload || typeof payload !== 'object') {
		return { ok: false, error: 'Invalid payload' };
	}

	const extra = parseLinkRows(payload.explore_links ?? [], 'Explore links');
	if (!extra.ok) return extra;
	const company = parseLinkRows(payload.company_links ?? [], 'Company links');
	if (!company.ok) return company;
	const main = parseLinkRows(payload.links, 'Extra footer links');
	if (!main.ok) return main;

	const prev = getFooterConfig();
	const blurb: FooterBlurb = { ...prev.blurb };
	if (payload.blurb && typeof payload.blurb === 'object') {
		for (const loc of LOCALES) {
			const v = payload.blurb[loc];
			if (v !== undefined) blurb[loc] = String(v ?? '');
		}
	}

	writeStore({
		updated_at: Date.now(),
		brand_title: mergeMainText(prev.brand_title, payload.brand_title),
		about_text: mergeMainText(prev.about_text, payload.about_text),
		explore_heading: mergeMainText(prev.explore_heading, payload.explore_heading),
		company_heading: mergeMainText(prev.company_heading, payload.company_heading),
		explore_links: extra.links,
		company_links: company.links,
		links: main.links,
		blurb,
	});
	return { ok: true };
}
