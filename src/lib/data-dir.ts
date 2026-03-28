import path from 'node:path';

/**
 * Returns the root directory where all JSON data files are stored.
 *
 * Set the DATA_DIR environment variable in production (e.g. in Coolify) to a
 * persistent directory so that users, messages, email settings, etc. survive
 * container redeploys. Example:
 *
 *   DATA_DIR=/data/coolify/applications/<your-app-id>
 *
 * Falls back to `process.cwd()/data` when DATA_DIR is not set (works in dev and CI).
 *
 * Coolify: attach persistent storage, mount it (e.g. under `/data/coolify/applications/...`),
 * set DATA_DIR to that mount at runtime. UPLOAD_ROOT is optional — if unset, uploads use
 * `DATA_DIR/uploads` automatically.
 */
export function getDataDir(): string {
	const env = process.env.DATA_DIR?.trim();
	if (env) return env;
	return path.join(process.cwd(), 'data');
}
