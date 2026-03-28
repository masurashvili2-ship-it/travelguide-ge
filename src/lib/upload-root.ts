import path from 'node:path';
import { getDataDir } from './data-dir';

/**
 * On-disk root for user uploads (`tours/`, `what-to-do/`, `regions/`, `guides/`, `packages/`).
 * URLs stay `/uploads/{subdir}/…`.
 *
 * - If **`UPLOAD_ROOT`** is set → use it (Coolify / DO: mount volume here).
 * - Else if **`DATA_DIR`** is set → **`${DATA_DIR}/uploads`** so JSON DBs and files share one volume.
 * - Else → `undefined` (callers fall back to `public/uploads` or `dist/client/uploads`).
 */
export function getUploadRootBase(): string | undefined {
	const explicit = process.env.UPLOAD_ROOT?.trim();
	if (explicit) return path.resolve(explicit);
	if (process.env.DATA_DIR?.trim()) {
		return path.resolve(path.join(getDataDir(), 'uploads'));
	}
	return undefined;
}
