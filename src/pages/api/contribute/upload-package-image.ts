import type { APIRoute } from 'astro';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { processTourImageToWebp } from '../../../lib/tour-image-process';
import { resolveUploadDir } from '../../../lib/resolve-upload-dir';
import {
	nextSequentialWebpFilename,
	slugifyTitleForUploadFilename,
	tourImageAltFromUrl,
} from '../../../lib/tour-upload-name';

const MAX_BYTES = 25 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const ct = request.headers.get('content-type') ?? '';
	if (!ct.includes('multipart/form-data')) {
		return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const fd = await request.formData();

	function firstNonEmptyField(key: string): string {
		for (const v of fd.getAll(key)) {
			if (typeof v === 'string' && v.trim()) return v.trim();
		}
		return '';
	}

	const titleField =
		firstNonEmptyField('tour_title') || firstNonEmptyField('title');
	const slugField = firstNonEmptyField('tour_slug') || firstNonEmptyField('slug');
	const displayTitle = titleField || slugField.replace(/-/g, ' ');

	const file = fd.get('file');
	if (!file || !(file instanceof File)) {
		return new Response(JSON.stringify({ error: 'Missing file field' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (file.size === 0) {
		return new Response(JSON.stringify({ error: 'Empty file' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (file.size > MAX_BYTES) {
		return new Response(JSON.stringify({ error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)` }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!titleField && !slugField) {
		return new Response(
			JSON.stringify({ error: 'Enter the title or URL slug before uploading (needed for file names).' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const buf = Buffer.from(await file.arrayBuffer());

	let webp: Buffer;
	try {
		webp = await processTourImageToWebp(buf);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Image processing failed';
		return new Response(JSON.stringify({ error: msg }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const dir = resolveUploadDir('packages');
	mkdirSync(dir, { recursive: true });
	let base = slugifyTitleForUploadFilename(titleField);
	if (!base) base = slugifyTitleForUploadFilename(slugField);
	if (!base) {
		return new Response(
			JSON.stringify({
				error:
					'Cannot derive a Latin file name from the title. Fill in the URL slug (e.g. tbilisi-wine-tour), then upload.',
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}
	const name = nextSequentialWebpFilename(base, dir);
	writeFileSync(path.join(dir, name), webp);

	const url = `/uploads/packages/${name}`;
	const alt = tourImageAltFromUrl(displayTitle || titleField || slugField, url);
	return new Response(JSON.stringify({ ok: true, url, alt }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
