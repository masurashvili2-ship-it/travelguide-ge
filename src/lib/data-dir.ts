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
 * Falls back to <cwd>/data when DATA_DIR is not set (works in dev and CI).
 */
export function getDataDir(): string {
	const env = process.env.DATA_DIR?.trim();
	if (env) return env;
	return path.join(process.cwd(), 'data');
}
