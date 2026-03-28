import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { invalidateFooterCache } from './footer-db';
import { invalidatePagesCache } from './pages-db';
import {
	applyRegionsBackupPayload,
	getRegionsBackupPayload,
	invalidateRegionsCache,
} from './regions-db';
import { invalidateSubmissionsCache } from './submissions-db';
import { invalidateWhatToDoCache } from './tours-db';
import { invalidateGuidesCache } from './guides-db';
import { invalidateGuidePackagesCache } from './guide-packages-db';
import { invalidateBookingsCache } from './bookings-db';

import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();

/** JSON files under `data/` that can be exported / imported together. */
export const DATA_BACKUP_FILENAMES = [
	'what-to-do.json',
	'guides.json',
	'guide-packages.json',
	'bookings.json',
	'regions.json',
	'pages.json',
	'footer.json',
	'content-submissions.json',
	'tour-comments.json',
	'users.json',
	'user-activity.json',
] as const;

export type DataBackupFilename = (typeof DATA_BACKUP_FILENAMES)[number];

/**
 * Logical post / store types for selective export and import (each maps to one JSON file).
 */
export const BACKUP_KIND_IDS = [
	'what-to-do',
	'guides',
	'guide-packages',
	'bookings',
	'regions',
	'pages',
	'footer',
	'submissions',
	'comments',
	'users',
	'activity',
] as const;

export type BackupKind = (typeof BACKUP_KIND_IDS)[number];

export const BACKUP_KIND_FILE: Record<BackupKind, DataBackupFilename> = {
	'what-to-do': 'what-to-do.json',
	guides: 'guides.json',
	'guide-packages': 'guide-packages.json',
	bookings: 'bookings.json',
	regions: 'regions.json',
	pages: 'pages.json',
	footer: 'footer.json',
	submissions: 'content-submissions.json',
	comments: 'tour-comments.json',
	users: 'users.json',
	activity: 'user-activity.json',
};

const FILE_TO_KIND = Object.fromEntries(
	(Object.entries(BACKUP_KIND_FILE) as [BackupKind, DataBackupFilename][]).map(([k, f]) => [f, k]),
) as Record<DataBackupFilename, BackupKind>;

export function filenameToBackupKind(name: DataBackupFilename): BackupKind {
	return FILE_TO_KIND[name];
}

export function parseBackupKindsFromParams(values: string[]): BackupKind[] | { error: string } {
	const out: BackupKind[] = [];
	const seen = new Set<string>();
	for (const raw of values) {
		for (const part of raw.split(',')) {
			const s = part.trim();
			if (!s) continue;
			if (!BACKUP_KIND_IDS.includes(s as BackupKind)) {
				return { error: `Unknown backup type: ${s}` };
			}
			const k = s as BackupKind;
			if (seen.has(k)) continue;
			seen.add(k);
			out.push(k);
		}
	}
	if (out.length === 0) return { error: 'Select at least one type' };
	return out;
}

export type DataBackupBundleV1 = {
	version: 1;
	app: 'travelguide-ge';
	exportedAt: string;
	files: Partial<Record<DataBackupFilename, unknown>>;
};

/** `replace` overwrites each file from the bundle. `merge` keeps existing rows and appends new ones (by id / email rules). */
export type ImportMode = 'replace' | 'merge';

export function dataFilePath(name: string): string {
	if (!DATA_BACKUP_FILENAMES.includes(name as DataBackupFilename)) {
		throw new Error(`Invalid data file name: ${name}`);
	}
	return path.join(DATA_DIR, name);
}

function ensureDataDir(): void {
	mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFileOrNull(relPath: string): unknown | null {
	const p = path.join(DATA_DIR, relPath);
	if (!existsSync(p)) return null;
	try {
		return JSON.parse(readFileSync(p, 'utf8')) as unknown;
	} catch {
		return null;
	}
}

function validatePayload(name: DataBackupFilename, data: unknown): string | null {
	if (data === null || typeof data !== 'object') return 'value must be a JSON object or array';
	switch (name) {
		case 'what-to-do.json':
		case 'regions.json':
		case 'pages.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.posts)) return 'expected { posts: array }';
			return null;
		}
		case 'guides.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.guides)) return 'expected { guides: array }';
			return null;
		}
		case 'guide-packages.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.packages)) return 'expected { packages: array, availability: array }';
			return null;
		}
		case 'bookings.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.bookings)) return 'expected { bookings: array }';
			return null;
		}
		case 'footer.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.links)) return 'expected { links: array }';
			if (!o.blurb || typeof o.blurb !== 'object') return 'expected { blurb: object }';
			return null;
		}
		case 'content-submissions.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.submissions)) return 'expected { submissions: array }';
			return null;
		}
		case 'tour-comments.json':
		case 'users.json':
		case 'user-activity.json':
			if (!Array.isArray(data)) return 'expected a JSON array';
			return null;
		default:
			return 'unknown file';
	}
}

function uniquifySlug(base: string, used: Set<string>): string {
	let s = base;
	let n = 1;
	while (used.has(s)) {
		n += 1;
		s = `${base}-${n}`;
	}
	return s;
}

function getRecordId(row: unknown): string | null {
	if (!row || typeof row !== 'object') return null;
	const id = (row as Record<string, unknown>).id;
	return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function getPostSlug(row: unknown): string {
	if (!row || typeof row !== 'object') return '';
	const s = (row as Record<string, unknown>).slug;
	return typeof s === 'string' ? s : '';
}

function parsePostsArray(existing: unknown): unknown[] {
	if (existing !== null && typeof existing === 'object' && Array.isArray((existing as Record<string, unknown>).posts)) {
		return [...((existing as { posts: unknown[] }).posts)];
	}
	return [];
}

function mergePostsStore(incoming: unknown, existing: unknown | null): { merged: { posts: unknown[] }; added: number } {
	const inc = incoming as { posts: unknown[] };
	const posts = parsePostsArray(existing);
	const ids = new Set(posts.map((p) => getRecordId(p)).filter(Boolean) as string[]);
	const slugs = new Set(posts.map((p) => getPostSlug(p)).filter(Boolean));
	let added = 0;
	for (const raw of inc.posts) {
		const id = getRecordId(raw);
		if (!id || ids.has(id)) continue;
		let row = raw;
		const slug = getPostSlug(raw);
		if (slug && slugs.has(slug)) {
			const nextSlug = uniquifySlug(slug, slugs);
			row =
				raw && typeof raw === 'object'
					? { ...(raw as Record<string, unknown>), slug: nextSlug }
					: raw;
			slugs.add(nextSlug);
		} else if (slug) {
			slugs.add(slug);
		}
		ids.add(id);
		posts.push(row);
		added += 1;
	}
	return { merged: { posts }, added };
}

function mergeFooterStore(incoming: unknown, existing: unknown | null): { merged: unknown; added: number } {
	const inc = incoming as Record<string, unknown>;
	const ex =
		existing !== null && typeof existing === 'object' && !Array.isArray(existing)
			? (existing as Record<string, unknown>)
			: {};
	const exLinks = Array.isArray(ex.links) ? [...ex.links] : [];
	const linkIds = new Set(
		exLinks.map((l) => (l && typeof l === 'object' ? getRecordId(l) : null)).filter(Boolean) as string[],
	);
	let maxOrder = 0;
	for (const l of exLinks) {
		if (l && typeof l === 'object' && typeof (l as Record<string, unknown>).order === 'number') {
			maxOrder = Math.max(maxOrder, (l as Record<string, unknown>).order as number);
		}
	}
	const incLinks = Array.isArray(inc.links) ? inc.links : [];
	let added = 0;
	let order = maxOrder + 1;
	for (const link of incLinks) {
		const id = link && typeof link === 'object' ? getRecordId(link) : null;
		if (!id || linkIds.has(id)) continue;
		linkIds.add(id);
		const withOrder =
			link && typeof link === 'object'
				? { ...(link as Record<string, unknown>), order }
				: link;
		order += 1;
		exLinks.push(withOrder);
		added += 1;
	}
	const merged = {
		updated_at: Math.max(
			typeof ex.updated_at === 'number' ? ex.updated_at : 0,
			typeof inc.updated_at === 'number' ? inc.updated_at : 0,
			Date.now(),
		),
		links: exLinks,
		/** Keep local footer text; only new links are appended from the bundle. */
		blurb:
			ex.blurb && typeof ex.blurb === 'object'
				? ex.blurb
				: inc.blurb && typeof inc.blurb === 'object'
					? inc.blurb
					: { en: '', ka: '', ru: '' },
	};
	return { merged, added };
}

function mergeSubmissionsStore(incoming: unknown, existing: unknown | null): { merged: unknown; added: number } {
	const inc = incoming as { submissions: unknown[] };
	const subs =
		existing !== null && typeof existing === 'object' && Array.isArray((existing as Record<string, unknown>).submissions)
			? [...((existing as { submissions: unknown[] }).submissions)]
			: [];
	const ids = new Set(subs.map((s) => getRecordId(s)).filter(Boolean) as string[]);
	let added = 0;
	for (const row of inc.submissions) {
		const id = getRecordId(row);
		if (!id || ids.has(id)) continue;
		ids.add(id);
		subs.push(row);
		added += 1;
	}
	return { merged: { submissions: subs }, added };
}

function getUserEmail(row: unknown): string | null {
	if (!row || typeof row !== 'object') return null;
	const e = (row as Record<string, unknown>).email;
	return typeof e === 'string' && e.trim() ? e.trim().toLowerCase() : null;
}

function mergeIdArray(incoming: unknown[], existing: unknown | null): { merged: unknown[]; added: number } {
	const rows = Array.isArray(existing) ? [...existing] : [];
	const ids = new Set(rows.map((r) => getRecordId(r)).filter(Boolean) as string[]);
	let added = 0;
	for (const row of incoming) {
		const id = getRecordId(row);
		if (!id || ids.has(id)) continue;
		ids.add(id);
		rows.push(row);
		added += 1;
	}
	return { merged: rows, added };
}

function mergeUsersArray(incoming: unknown[], existing: unknown | null): { merged: unknown[]; added: number } {
	const rows = Array.isArray(existing) ? [...existing] : [];
	const ids = new Set(rows.map((r) => getRecordId(r)).filter(Boolean) as string[]);
	const emails = new Set(rows.map((r) => getUserEmail(r)).filter(Boolean) as string[]);
	let added = 0;
	for (const row of incoming) {
		const id = getRecordId(row);
		if (!id || ids.has(id)) continue;
		const em = getUserEmail(row);
		if (em && emails.has(em)) continue;
		ids.add(id);
		if (em) emails.add(em);
		rows.push(row);
		added += 1;
	}
	return { merged: rows, added };
}

function mergeGuidesStore(incoming: unknown, existing: unknown | null): { merged: { guides: unknown[] }; added: number } {
	const inc = incoming as { guides: unknown[] };
	const existingGuides =
		existing !== null && typeof existing === 'object' && Array.isArray((existing as Record<string, unknown>).guides)
			? [...((existing as { guides: unknown[] }).guides)]
			: [];
	const ids = new Set(existingGuides.map((p) => getRecordId(p)).filter(Boolean) as string[]);
	const slugs = new Set(existingGuides.map((p) => getPostSlug(p)).filter(Boolean));
	let added = 0;
	for (const raw of inc.guides) {
		const id = getRecordId(raw);
		if (!id || ids.has(id)) continue;
		let row = raw;
		const slug = getPostSlug(raw);
		if (slug && slugs.has(slug)) {
			const nextSlug = uniquifySlug(slug, slugs);
			row = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>), slug: nextSlug } : raw;
			slugs.add(nextSlug);
		} else if (slug) {
			slugs.add(slug);
		}
		ids.add(id);
		existingGuides.push(row);
		added += 1;
	}
	return { merged: { guides: existingGuides }, added };
}

function mergePayloadForFile(
	name: DataBackupFilename,
	incoming: unknown,
	existing: unknown | null,
): { payload: unknown; added: number } {
	switch (name) {
		case 'what-to-do.json':
		case 'regions.json':
		case 'pages.json': {
			const { merged, added } = mergePostsStore(incoming, existing);
			return { payload: merged, added };
		}
		case 'guides.json': {
			const { merged, added } = mergeGuidesStore(incoming, existing);
			return { payload: merged, added };
		}
		case 'footer.json': {
			const { merged, added } = mergeFooterStore(incoming, existing);
			return { payload: merged, added };
		}
		case 'content-submissions.json': {
			const { merged, added } = mergeSubmissionsStore(incoming, existing);
			return { payload: merged, added };
		}
		case 'tour-comments.json':
		case 'user-activity.json': {
			const inc = incoming as unknown[];
			const { merged, added } = mergeIdArray(inc, existing);
			return { payload: merged, added };
		}
		case 'users.json': {
			const inc = incoming as unknown[];
			const { merged, added } = mergeUsersArray(inc, existing);
			return { payload: merged, added };
		}
		default:
			return { payload: incoming, added: 0 };
	}
}

export function buildExportBundle(options: {
	includeUsers: boolean;
	/** `null` = include every file (subject to includeUsers). Otherwise only these kinds. */
	kinds: BackupKind[] | null;
}): DataBackupBundleV1 {
	const files: Partial<Record<DataBackupFilename, unknown>> = {};
	const names: DataBackupFilename[] =
		options.kinds === null
			? [...DATA_BACKUP_FILENAMES]
			: options.kinds.map((k) => BACKUP_KIND_FILE[k]);

	for (const name of names) {
		if (!options.includeUsers && name === 'users.json') continue;
		if (name === 'regions.json') {
			// Regions live in data/regions/ folder — read via the db layer
			files[name] = getRegionsBackupPayload();
			continue;
		}
		const raw = readJsonFileOrNull(name);
		if (raw !== null) {
			files[name] = raw;
		}
	}
	return {
		version: 1,
		app: 'travelguide-ge',
		exportedAt: new Date().toISOString(),
		files,
	};
}

export function serializeBackupBundle(bundle: DataBackupBundleV1): string {
	return `${JSON.stringify(bundle, null, '\t')}\n`;
}

export function parseBackupBundle(raw: unknown): DataBackupBundleV1 | { error: string } {
	if (raw === null || typeof raw !== 'object') return { error: 'Root must be a JSON object' };
	const o = raw as Record<string, unknown>;
	if (o.version !== 1) return { error: 'Unsupported or missing version (expected 1)' };
	if (o.app !== 'travelguide-ge') return { error: 'Unknown app id (expected travelguide-ge)' };
	if (o.files === null || typeof o.files !== 'object' || Array.isArray(o.files)) {
		return { error: 'Missing or invalid "files" object' };
	}
	const files = o.files as Record<string, unknown>;
	const out: Partial<Record<DataBackupFilename, unknown>> = {};
	for (const name of DATA_BACKUP_FILENAMES) {
		if (!(name in files)) continue;
		const payload = files[name];
		const err = validatePayload(name, payload);
		if (err) return { error: `${name}: ${err}` };
		out[name] = payload;
	}
	if (Object.keys(out).length === 0) return { error: 'No valid files in bundle' };
	return {
		version: 1,
		app: 'travelguide-ge',
		exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : new Date().toISOString(),
		files: out,
	};
}

function invalidateCachesForFiles(written: DataBackupFilename[]): void {
	const w = new Set(written);
	if (w.has('what-to-do.json')) invalidateWhatToDoCache();
	if (w.has('guides.json')) invalidateGuidesCache();
	if (w.has('guide-packages.json')) invalidateGuidePackagesCache();
	if (w.has('bookings.json')) invalidateBookingsCache();
	if (w.has('regions.json')) invalidateRegionsCache();
	if (w.has('pages.json')) invalidatePagesCache();
	if (w.has('footer.json')) invalidateFooterCache();
	if (w.has('content-submissions.json')) invalidateSubmissionsCache();
}

export function applyImportBundle(
	bundle: DataBackupBundleV1,
	options: {
		importUsers: boolean;
		/** `null` = import every file present in the bundle (respecting importUsers). Otherwise only these kinds. */
		kindsFilter: BackupKind[] | null;
		importMode: ImportMode;
	},
):
	| { ok: true; written: string[]; mergeAdded: number; importMode: ImportMode }
	| { ok: false; error: string } {
	const allowedFiles =
		options.kindsFilter === null
			? null
			: new Set(options.kindsFilter.map((k) => BACKUP_KIND_FILE[k]));

	const planned: { name: DataBackupFilename; payload: unknown }[] = [];

	for (const name of DATA_BACKUP_FILENAMES) {
		if (!(name in bundle.files)) continue;
		if (allowedFiles !== null && !allowedFiles.has(name)) continue;
		if (!options.importUsers && name === 'users.json') continue;
		const payload = bundle.files[name];
		const err = validatePayload(name, payload);
		if (err) return { ok: false, error: `${name}: ${err}` };
		planned.push({ name, payload });
	}

	if (planned.length === 0) {
		return {
			ok: false,
			error:
				options.kindsFilter !== null && options.kindsFilter.length > 0
					? 'Nothing to import: the file has no data for the selected types (or users import is off).'
					: 'No files to import. Enable “Import users” if the bundle only contains users.json.',
		};
	}

	ensureDataDir();
	const written: DataBackupFilename[] = [];
	let mergeAdded = 0;
	for (const { name, payload } of planned) {
		let out = payload;
		if (options.importMode === 'merge') {
			// For regions, read live data from the folder structure (not a flat file)
			const existing = name === 'regions.json' ? getRegionsBackupPayload() : readJsonFileOrNull(name);
			const { payload: merged, added } = mergePayloadForFile(name, payload, existing);
			out = merged;
			mergeAdded += added;
		}
		const errOut = validatePayload(name, out);
		if (errOut) return { ok: false, error: `${name} after merge: ${errOut}` };
		if (name === 'regions.json') {
			// Regions live in data/regions/ folder — write via the db layer
			applyRegionsBackupPayload(out as { posts: unknown[] });
		} else {
			writeFileSync(dataFilePath(name), `${JSON.stringify(out, null, '\t')}\n`, 'utf8');
		}
		written.push(name);
	}

	invalidateCachesForFiles(written);

	return { ok: true, written, mergeAdded, importMode: options.importMode };
}
