/**
 * Keep in sync with `src/lib/resolve-upload-dir.ts` (upload API + middleware use the TS copy).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolveUploadDir(subdir) {
	if (subdir === 'tours') {
		const o = process.env.TOUR_UPLOAD_DIR?.trim();
		if (o) return path.resolve(o);
	}
	if (subdir === 'what-to-do') {
		const o = process.env.WTD_UPLOAD_DIR?.trim();
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
