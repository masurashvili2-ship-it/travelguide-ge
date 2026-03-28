import type { APIRoute } from 'astro';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { resolveSafe } from '../../../../lib/admin-file-manager';

export const prerender = false;

const MIME: Record<string, string> = {
	json: 'application/json',
	txt: 'text/plain',
	csv: 'text/csv',
	md: 'text/markdown',
	pdf: 'application/pdf',
	zip: 'application/zip',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	mp4: 'video/mp4',
	webm: 'video/webm',
};

function mimeFor(filename: string): string {
	const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
	return MIME[ext] ?? 'application/octet-stream';
}

export const GET: APIRoute = async ({ request, locals }) => {
	if (locals.user?.role !== 'admin') {
		return new Response('Forbidden', { status: 403 });
	}
	const url = new URL(request.url);
	const rel = url.searchParams.get('path') ?? '';
	const abs = resolveSafe(rel);
	if (!abs) {
		return new Response('Invalid path', { status: 400 });
	}
	if (!existsSync(abs) || statSync(abs).isDirectory()) {
		return new Response('Not found', { status: 404 });
	}
	try {
		const data = readFileSync(abs);
		const name = path.basename(abs);
		const mime = mimeFor(name);
		const inline = mime.startsWith('image/') || mime.startsWith('video/') || mime === 'application/json' || mime.startsWith('text/');
		return new Response(data, {
			status: 200,
			headers: {
				'Content-Type': mime,
				'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"`,
				'Content-Length': String(data.length),
				'Cache-Control': 'no-store',
			},
		});
	} catch {
		return new Response('Read error', { status: 500 });
	}
};
