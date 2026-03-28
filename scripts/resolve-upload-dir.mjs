/**
 * Keep in sync with `src/lib/resolve-upload-dir.ts` (upload API + middleware use the TS copy).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

function getDataDir() {
	const env = process.env.DATA_DIR?.trim();
	if (env) return env;
	return path.join(process.cwd(), 'data');
}

/** Same rules as `src/lib/upload-root.ts`. */
function getUploadRootBase() {
	const explicit = process.env.UPLOAD_ROOT?.trim();
	if (explicit) return path.resolve(explicit);
	if (process.env.DATA_DIR?.trim()) {
		return path.resolve(path.join(getDataDir(), 'uploads'));
	}
	return undefined;
}

export function resolveUploadDir(subdir) {
	if (subdir === 'tours') {
		const o = process.env.TOUR_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	if (subdir === 'what-to-do') {
		const o = process.env.WTD_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	if (subdir === 'regions') {
		const o = process.env.REGION_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	if (subdir === 'guides') {
		const o = process.env.GUIDES_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	if (subdir === 'packages') {
		const o = process.env.PACKAGES_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	const root = getUploadRootBase();
	if (root) return path.resolve(path.join(root, subdir));

	const prodClient = path.join(process.cwd(), 'dist', 'client', 'uploads', subdir);
	if (process.env.NODE_ENV === 'production' && existsSync(path.join(process.cwd(), 'dist', 'client'))) {
		return prodClient;
	}
	return path.join(process.cwd(), 'public', 'uploads', subdir);
}
