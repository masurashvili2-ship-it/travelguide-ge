import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveUploadDir } from './resolve-upload-dir';

const UPLOAD_PATH = /^\/uploads\/(tours|what-to-do|guides)\/(.+)$/;

/**
 * Serves `/uploads/tours/…` and `/uploads/what-to-do/…` from the same dirs the upload APIs write to
 * (including `UPLOAD_ROOT` / persistent volumes). Runs in middleware so it wins over missing static files.
 */
export async function serveUserUploadIfPresent(request: Request): Promise<Response | null> {
	if (request.method !== 'GET' && request.method !== 'HEAD') return null;
	const pathname = new URL(request.url).pathname;
	const m = pathname.match(UPLOAD_PATH);
	if (!m) return null;
	const kind = m[1] as 'tours' | 'what-to-do' | 'guides';
	const rest = m[2];
	if (!rest || rest.includes('..')) {
		return new Response(null, {
			status: 404,
			headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
		});
	}
	const base = path.resolve(resolveUploadDir(kind));
	const filePath = path.resolve(path.join(base, rest));
	const rel = path.relative(base, filePath);
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		return new Response(null, {
			status: 404,
			headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
		});
	}
	const miss404 = new Response(null, {
		status: 404,
		headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
	});
	try {
		const st = await stat(filePath);
		if (!st.isFile()) return miss404;
	} catch {
		return miss404;
	}
	const body = request.method === 'HEAD' ? null : await readFile(filePath);
	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': 'public, max-age=86400',
		},
	});
}
