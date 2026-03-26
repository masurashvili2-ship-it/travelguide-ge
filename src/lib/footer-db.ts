import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Locale } from './strings';
import { isValidSlug } from './tours-db';

const DATA_DIR = path.join(process.cwd(), 'data');
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

export type FooterConfig = {
	updated_at: number;
	links: FooterLink[];
	/** Optional Markdown shown under the link row on every public page. */
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
	if (!t) return false;
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

function normalizeLink(raw: unknown): FooterLink | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' && isValidLinkId(o.id) ? o.id : randomUUID();
	const orderRaw = o.order;
	const order = typeof orderRaw === 'number' && Number.isFinite(orderRaw) ? orderRaw : 0;
	const ip = o.internal_path;
	const eu = o.external_url;
	const internal_path =
		ip == null || String(ip).trim() === '' ? null : String(ip).trim().toLowerCase();
	const external_url =
		eu == null || String(eu).trim() === '' ? null : String(eu).trim();
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

function readStore(): FooterConfig {
	if (!existsSync(STORE_FILE)) {
		return {
			updated_at: Date.now(),
			links: [],
			blurb: { en: '', ka: '', ru: '' },
		};
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
			links,
			blurb: normalizeBlurb(raw.blurb),
		};
	} catch {
		return {
			updated_at: Date.now(),
			links: [],
			blurb: { en: '', ka: '', ru: '' },
		};
	}
}

function writeStore(cfg: FooterConfig) {
	ensureDataDir();
	writeFileSync(STORE_FILE, JSON.stringify(cfg, null, 2), 'utf8');
	cached = { ...cfg, links: [...cfg.links] };
	try {
		cachedMtimeMs = statSync(STORE_FILE).mtimeMs;
	} catch {
		cachedMtimeMs = Date.now();
	}
}

export function getFooterConfig(): FooterConfig {
	if (!existsSync(STORE_FILE)) {
		cached = readStore();
		cachedMtimeMs = 0;
		return {
			updated_at: cached.updated_at,
			links: [...cached.links],
			blurb: { ...cached.blurb },
		};
	}
	const mtime = footerFileMtimeMs();
	if (cached === null || mtime > cachedMtimeMs) {
		cached = readStore();
		cachedMtimeMs = mtime;
	}
	return {
		updated_at: cached.updated_at,
		links: [...cached.links],
		blurb: { ...cached.blurb },
	};
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

/** Navigation entries for the public footer for one locale (ordered). */
export function getFooterNavForLocale(locale: Locale): FooterNavEntry[] {
	const { links } = getFooterConfig();
	const sorted = [...links].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.id.localeCompare(b.id);
	});
	const out: FooterNavEntry[] = [];
	for (const link of sorted) {
		const title = pickTitle(link, locale);
		if (!title) continue;
		if (link.internal_path) {
			const p = link.internal_path.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
			if (!isValidInternalPath(p)) continue;
			out.push({ kind: 'internal', path: p, title });
		} else if (link.external_url && isValidExternalUrl(link.external_url)) {
			out.push({ kind: 'external', url: link.external_url.trim(), title });
		}
	}
	return out;
}

export function getFooterBlurbMarkdown(locale: Locale): string {
	return getFooterConfig().blurb[locale]?.trim() ?? '';
}

export type SaveFooterPayload = {
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

export function saveFooterFromPayload(
	payload: SaveFooterPayload,
): { ok: true } | { ok: false; error: string } {
	if (!payload || typeof payload !== 'object') {
		return { ok: false, error: 'Invalid payload' };
	}
	const rawLinks = payload.links;
	if (!Array.isArray(rawLinks)) {
		return { ok: false, error: 'links must be an array' };
	}

	const links: FooterLink[] = [];
	let outIdx = 0;
	for (let idx = 0; idx < rawLinks.length; idx++) {
		const raw = rawLinks[idx];
		if (!raw || typeof raw !== 'object') continue;
		const rowLabel = `Link row ${idx + 1}`;
		const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : outIdx;
		const ip =
			raw.internal_path == null || String(raw.internal_path).trim() === ''
				? null
				: String(raw.internal_path).trim().toLowerCase();
		const eu =
			raw.external_url == null || String(raw.external_url).trim() === ''
				? null
				: String(raw.external_url).trim();

		const title_en = String(raw.title_en ?? '').trim();
		const title_ka = String(raw.title_ka ?? '').trim();
		const title_ru = String(raw.title_ru ?? '').trim();

		const hasTarget = !!(ip || eu);
		const hasTitle = !!(title_en || title_ka || title_ru);
		if (!hasTarget && !hasTitle) continue;
		if (!hasTarget) {
			return { ok: false, error: `${rowLabel}: add an internal path or external URL` };
		}
		if (!hasTitle) {
			return { ok: false, error: `${rowLabel}: add at least one title (EN, KA, or RU)` };
		}

		if (ip && eu) {
			return { ok: false, error: `${rowLabel}: use either internal path or external URL, not both` };
		}
		if (ip && !isValidInternalPath(ip)) {
			return { ok: false, error: `${rowLabel}: invalid internal path` };
		}
		if (eu && !isValidExternalUrl(eu)) {
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
		links,
		blurb,
	});
	return { ok: true };
}
