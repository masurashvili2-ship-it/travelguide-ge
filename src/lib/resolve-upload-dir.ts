import { existsSync } from 'node:fs';
import path from 'node:path';

export type UploadSubdir = 'tours' | 'what-to-do' | 'regions' | 'guides';

/**
 * Writable directory for user uploads. URLs stay `/uploads/{subdir}/…`.
 *
 * On App Platform with multiple instances, set **`UPLOAD_ROOT`** to a persistent volume path
 * (e.g. `/mnt/travelguide_uploads`) so every instance reads the same files. Optional per-kind
 * overrides: **`TOUR_UPLOAD_DIR`**, **`WTD_UPLOAD_DIR`**, or place regions under **`UPLOAD_ROOT/regions`**.
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
	const root = process.env.UPLOAD_ROOT?.trim();
	if (root) return path.resolve(path.join(root, subdir));

	const prodClient = path.join(process.cwd(), 'dist', 'client', 'uploads', subdir);
	if (process.env.NODE_ENV === 'production' && existsSync(path.join(process.cwd(), 'dist', 'client'))) {
		return prodClient;
	}
	return path.join(process.cwd(), 'public', 'uploads', subdir);
}
