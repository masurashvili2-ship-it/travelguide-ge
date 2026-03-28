import { existsSync } from 'node:fs';
import path from 'node:path';
import { getUploadRootBase } from './upload-root';

export type UploadSubdir = 'tours' | 'what-to-do' | 'regions' | 'guides' | 'packages';

/**
 * Writable directory for user uploads. URLs stay `/uploads/{subdir}/…`.
 *
 * On production, set **`DATA_DIR`** to a persistent volume (JSON DBs). Uploads default to
 * **`${DATA_DIR}/uploads`** unless **`UPLOAD_ROOT`** is set. Optional per-kind overrides:
 * **`TOUR_UPLOAD_DIR`**, **`WTD_UPLOAD_DIR`**, **`REGION_UPLOAD_DIR`**, **`GUIDES_UPLOAD_DIR`**, **`PACKAGES_UPLOAD_DIR`**.
 */
export function resolveUploadDir(subdir: UploadSubdir): string {
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
