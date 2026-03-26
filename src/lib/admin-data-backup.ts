import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { invalidateFooterCache } from './footer-db';
import { invalidatePagesCache } from './pages-db';
import { invalidateRegionsCache } from './regions-db';
import { invalidateSubmissionsCache } from './submissions-db';
import { invalidateToursCache, invalidateWhatToDoCache } from './tours-db';

const DATA_DIR = path.join(process.cwd(), 'data');

/** JSON files under `data/` that can be exported / imported together. */
export const DATA_BACKUP_FILENAMES = [
	'tours.json',
	'what-to-do.json',
	'regions.json',
	'pages.json',
	'footer.json',
	'content-submissions.json',
	'tour-comments.json',
	'users.json',
	'user-activity.json',
] as const;

export type DataBackupFilename = (typeof DATA_BACKUP_FILENAMES)[number];

export type DataBackupBundleV1 = {
	version: 1;
	app: 'travelguide-ge';
	exportedAt: string;
	files: Partial<Record<DataBackupFilename, unknown>>;
};

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
		case 'tours.json':
		case 'what-to-do.json':
		case 'regions.json':
		case 'pages.json': {
			const o = data as Record<string, unknown>;
			if (!Array.isArray(o.posts)) return 'expected { posts: array }';
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

export function buildExportBundle(includeUsers: boolean): DataBackupBundleV1 {
	const files: Partial<Record<DataBackupFilename, unknown>> = {};
	for (const name of DATA_BACKUP_FILENAMES) {
		if (!includeUsers && name === 'users.json') continue;
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

export function applyImportBundle(
	bundle: DataBackupBundleV1,
	options: { importUsers: boolean },
): { ok: true; written: string[] } | { ok: false; error: string } {
	const planned: { name: DataBackupFilename; payload: unknown }[] = [];

	for (const name of DATA_BACKUP_FILENAMES) {
		if (!(name in bundle.files)) continue;
		if (!options.importUsers && name === 'users.json') continue;
		const payload = bundle.files[name];
		const err = validatePayload(name, payload);
		if (err) return { ok: false, error: `${name}: ${err}` };
		planned.push({ name, payload });
	}

	if (planned.length === 0) {
		return {
			ok: false,
			error: 'No files to import. Enable “Import users” if the bundle only contains users.json.',
		};
	}

	ensureDataDir();
	const written: string[] = [];
	for (const { name, payload } of planned) {
		writeFileSync(dataFilePath(name), `${JSON.stringify(payload, null, '\t')}\n`, 'utf8');
		written.push(name);
	}

	invalidateToursCache();
	invalidateWhatToDoCache();
	invalidateRegionsCache();
	invalidatePagesCache();
	invalidateFooterCache();
	invalidateSubmissionsCache();

	return { ok: true, written };
}
