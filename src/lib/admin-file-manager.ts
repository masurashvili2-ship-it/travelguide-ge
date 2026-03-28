import {
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';
import { getUploadRootBase } from './upload-root';

export type FileManagerEntry = {
	name: string;
	path: string;
	isDir: boolean;
	size: number;
	mtime: number;
	ext: string;
	url: string | null;
};

function getRoot(): string {
	const dataDir = process.env.DATA_DIR?.trim();
	if (dataDir) return path.resolve(dataDir);
	// Fallback: use upload root so the file manager still works without DATA_DIR
	const uploadRoot = getUploadRootBase();
	if (uploadRoot) return uploadRoot;
	if (
		process.env.NODE_ENV === 'production' &&
		existsSync(path.join(process.cwd(), 'dist', 'client'))
	) {
		return path.join(process.cwd(), 'dist', 'client', 'uploads');
	}
	return path.join(process.cwd(), 'public', 'uploads');
}

export const FM_ROOT = getRoot();

/** Uploads subdir within FM_ROOT (used for public URL mapping). */
const UPLOADS_SUBDIR = (() => {
	const uploadRoot = getUploadRootBase();
	if (uploadRoot) return path.resolve(uploadRoot);
	return path.join(FM_ROOT, 'uploads');
})();

/** Resolve a relative path safely within FM_ROOT, returning null on traversal. */
export function resolveSafe(rel: string): string | null {
	const cleaned = rel
		.replace(/\\/g, '/')
		.split('/')
		.filter((p) => p && p !== '.' && p !== '..')
		.join('/');
	const abs = cleaned ? path.join(FM_ROOT, cleaned) : FM_ROOT;
	if (!abs.startsWith(FM_ROOT + path.sep) && abs !== FM_ROOT) return null;
	return abs;
}

function extOf(name: string): string {
	const i = name.lastIndexOf('.');
	return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function relUrl(abs: string, relPath: string): string | null {
	// Files inside the uploads subdir have public /uploads/... URLs
	const uploadsNorm = UPLOADS_SUBDIR.replace(/\\/g, '/');
	const absNorm = abs.replace(/\\/g, '/');
	if (absNorm.startsWith(uploadsNorm + '/') || absNorm === uploadsNorm) {
		const after = absNorm.slice(uploadsNorm.length);
		return '/uploads' + after;
	}
	// All other files (JSON, etc.) are served via admin download endpoint
	return `/api/admin/files/raw?path=${encodeURIComponent(relPath)}`;
}

export function listDirectory(rel: string): { ok: true; entries: FileManagerEntry[]; relPath: string } | { ok: false; error: string } {
	const abs = resolveSafe(rel);
	if (!abs) return { ok: false, error: 'Invalid path' };
	if (!existsSync(abs)) return { ok: false, error: 'Directory not found' };
	const stat = statSync(abs);
	if (!stat.isDirectory()) return { ok: false, error: 'Not a directory' };

	try {
		const names = readdirSync(abs);
		const entries: FileManagerEntry[] = [];
		for (const name of names) {
			if (name.startsWith('.')) continue;
			const full = path.join(abs, name);
			try {
				const s = statSync(full);
				const isDir = s.isDirectory();
				const relFull = full.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
				const url = isDir ? null : relUrl(full, relFull);
				entries.push({
					name,
					path: relFull,
					isDir,
					size: s.size,
					mtime: s.mtimeMs,
					ext: isDir ? '' : extOf(name),
					url,
				});
			} catch {
				// skip unreadable entries
			}
		}
		entries.sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		const relPath = abs.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
		return { ok: true, entries, relPath };
	} catch {
		return { ok: false, error: 'Could not read directory' };
	}
}

export function deleteEntry(rel: string): { ok: true } | { ok: false; error: string } {
	const abs = resolveSafe(rel);
	if (!abs || abs === FM_ROOT) return { ok: false, error: 'Invalid path' };
	if (!existsSync(abs)) return { ok: false, error: 'Not found' };
	try {
		rmSync(abs, { recursive: true, force: true });
		return { ok: true };
	} catch {
		return { ok: false, error: 'Delete failed' };
	}
}

export function renameEntry(
	relFrom: string,
	newName: string,
): { ok: true; newPath: string } | { ok: false; error: string } {
	if (!newName || /[\\/:\*\?"<>|]/.test(newName) || newName === '.' || newName === '..')
		return { ok: false, error: 'Invalid name' };
	const absFrom = resolveSafe(relFrom);
	if (!absFrom || absFrom === FM_ROOT) return { ok: false, error: 'Invalid path' };
	if (!existsSync(absFrom)) return { ok: false, error: 'Not found' };
	const parent = path.dirname(absFrom);
	const absTo = path.join(parent, newName);
	if (!absTo.startsWith(FM_ROOT + path.sep) && absTo !== FM_ROOT)
		return { ok: false, error: 'Invalid target' };
	if (existsSync(absTo)) return { ok: false, error: 'A file with that name already exists' };
	try {
		renameSync(absFrom, absTo);
		const newRel = absTo.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
		return { ok: true, newPath: newRel };
	} catch {
		return { ok: false, error: 'Rename failed' };
	}
}

export function moveEntry(
	relFrom: string,
	relToDir: string,
): { ok: true; newPath: string } | { ok: false; error: string } {
	const absFrom = resolveSafe(relFrom);
	if (!absFrom || absFrom === FM_ROOT) return { ok: false, error: 'Invalid source' };
	if (!existsSync(absFrom)) return { ok: false, error: 'Source not found' };
	const absToDir = resolveSafe(relToDir) ?? FM_ROOT;
	if (!existsSync(absToDir) || !statSync(absToDir).isDirectory())
		return { ok: false, error: 'Target directory not found' };
	const name = path.basename(absFrom);
	const absTo = path.join(absToDir, name);
	if (!absTo.startsWith(FM_ROOT + path.sep)) return { ok: false, error: 'Invalid target' };
	if (existsSync(absTo)) return { ok: false, error: 'File already exists in target' };
	try {
		renameSync(absFrom, absTo);
		const newRel = absTo.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
		return { ok: true, newPath: newRel };
	} catch {
		return { ok: false, error: 'Move failed' };
	}
}

export function createDirectory(
	relParent: string,
	name: string,
): { ok: true; path: string } | { ok: false; error: string } {
	if (!name || /[\\/:\*\?"<>|]/.test(name) || name === '.' || name === '..')
		return { ok: false, error: 'Invalid folder name' };
	const absParent = resolveSafe(relParent) ?? FM_ROOT;
	if (!existsSync(absParent)) return { ok: false, error: 'Parent not found' };
	const absNew = path.join(absParent, name);
	if (!absNew.startsWith(FM_ROOT + path.sep)) return { ok: false, error: 'Invalid path' };
	if (existsSync(absNew)) return { ok: false, error: 'Already exists' };
	try {
		mkdirSync(absNew, { recursive: true });
		const rel = absNew.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
		return { ok: true, path: rel };
	} catch {
		return { ok: false, error: 'Could not create directory' };
	}
}

export function saveUploadedFile(
	relDir: string,
	filename: string,
	data: Buffer,
): { ok: true; path: string; url: string } | { ok: false; error: string } {
	const absDir = resolveSafe(relDir) ?? FM_ROOT;
	if (!existsSync(absDir)) {
		try { mkdirSync(absDir, { recursive: true }); } catch { return { ok: false, error: 'Cannot create dir' }; }
	}
	const safe = filename.replace(/[^\w.\-]/g, '_').replace(/\.{2,}/g, '_');
	if (!safe) return { ok: false, error: 'Invalid filename' };
	const abs = path.join(absDir, safe);
	if (!abs.startsWith(FM_ROOT + path.sep)) return { ok: false, error: 'Invalid target' };
	try {
		writeFileSync(abs, data);
		const rel = abs.slice(FM_ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
		const url = '/uploads/' + rel;
		return { ok: true, path: rel, url };
	} catch {
		return { ok: false, error: 'Write failed' };
	}
}
