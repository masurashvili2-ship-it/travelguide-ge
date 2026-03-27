/**
 * Production HTTP entry: serve user uploads from the shared upload dir *before* Astro's static
 * handler runs. @astrojs/node always tries `dist/client` first; without a shared volume, each
 * instance only has files that were uploaded to that box — images randomly break behind a load
 * balancer. This layer uses the same paths as `src/lib/resolve-upload-dir.ts`.
 *
 * Set `UPLOAD_ROOT` to a persistent volume (subfolders `tours`, `what-to-do`, `regions`) on App Platform.
 */
process.env.ASTRO_NODE_AUTOSTART = 'disabled';

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveUploadDir } from './resolve-upload-dir.mjs';

/**
 * If DATA_DIR is set (persistent volume), copy any files that are missing there
 * from the built-in /app/data/ directory (git defaults baked into the image).
 * Files that already exist in DATA_DIR are never overwritten — admin edits survive deploys.
 */
async function seedDataDir() {
	const dataDir = process.env.DATA_DIR?.trim();
	if (!dataDir) return;

	const builtIn = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'data');

	async function seedDir(srcDir, destDir) {
		let entries;
		try {
			entries = await fs.readdir(srcDir, { withFileTypes: true });
		} catch {
			return;
		}
		await fs.mkdir(destDir, { recursive: true });
		for (const entry of entries) {
			const src = path.join(srcDir, entry.name);
			const dest = path.join(destDir, entry.name);
			if (entry.isDirectory()) {
				await seedDir(src, dest);
			} else {
				try {
					await fs.access(dest);
					// File already exists — keep it (preserves admin edits)
				} catch {
					try {
						await fs.copyFile(src, dest);
						console.log(`[data-seed] seeded ${dest}`);
					} catch (e) {
						console.warn(`[data-seed] could not copy ${src} → ${dest}:`, e.message);
					}
				}
			}
		}
	}

	await seedDir(builtIn, dataDir);
}

await seedDataDir();

const UPLOAD_PATH = /^\/uploads\/(tours|what-to-do|regions)\/(.+)$/;

const entryHref = new URL('../dist/server/entry.mjs', import.meta.url).href;
const { handler: astroHandler } = await import(entryHref);

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
const host = process.env.HOST ?? '0.0.0.0';

if (process.env.NODE_ENV === 'production') {
	const hasShared =
		Boolean(process.env.UPLOAD_ROOT?.trim()) ||
		Boolean(process.env.TOUR_UPLOAD_DIR?.trim()) ||
		Boolean(process.env.WTD_UPLOAD_DIR?.trim()) ||
		Boolean(process.env.REGION_UPLOAD_DIR?.trim());
	if (!hasShared) {
		console.warn(
			'[travelguide] No UPLOAD_ROOT / TOUR_UPLOAD_DIR / WTD_UPLOAD_DIR / REGION_UPLOAD_DIR. With more than one app worker, ' +
				'uploads exist only on the instance that handled the upload — images will randomly break. ' +
				'Set UPLOAD_ROOT to a persistent volume (subfolders `tours`, `what-to-do`, `regions`) or scale to 1 worker. ' +
				'See data/USERS-DEPLOY.md.',
		);
	}
}

/**
 * @returns {Promise<boolean>} true if the response was fully handled
 */
async function serveUploadIfPresent(req, res) {
	if (req.method !== 'GET' && req.method !== 'HEAD') return false;
	if (!req.url) return false;

	let pathname;
	try {
		const u = new URL(req.url, 'http://localhost');
		pathname = u.pathname;
	} catch {
		return false;
	}

	const m = pathname.match(UPLOAD_PATH);
	if (!m) return false;

	const kind = m[1];
	const rest = m[2];
	if (!rest || rest.includes('..')) {
		res.writeHead(404, {
			'Cache-Control': 'private, no-store, must-revalidate',
		});
		res.end();
		return true;
	}

	const base = path.resolve(resolveUploadDir(kind));
	const filePath = path.resolve(path.join(base, rest));
	const rel = path.relative(base, filePath);
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		res.writeHead(404, {
			'Cache-Control': 'private, no-store, must-revalidate',
		});
		res.end();
		return true;
	}

	try {
		const st = await fs.stat(filePath);
		if (!st.isFile()) return false;
	} catch {
		return false;
	}

	const headers = {
		'Content-Type': 'image/webp',
		'Cache-Control': 'public, max-age=86400',
	};

	if (req.method === 'HEAD') {
		res.writeHead(200, headers);
		res.end();
		return true;
	}

	const body = await fs.readFile(filePath);
	res.writeHead(200, headers);
	res.end(body);
	return true;
}

const server = http.createServer((req, res) => {
	void (async () => {
		try {
			const handled = await serveUploadIfPresent(req, res);
			if (!handled) astroHandler(req, res);
		} catch (e) {
			console.error('[travelguide] request error', e);
			if (!res.headersSent) {
				res.statusCode = 500;
				res.end('Internal Server Error');
			}
		}
	})();
});

server.listen(port, host, () => {
	if (process.env.ASTRO_NODE_LOGGING !== 'disabled') {
		console.log(`Server listening on http://${host}:${port}`);
	}
});
