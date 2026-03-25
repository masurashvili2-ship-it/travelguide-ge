import { mkdirSync, readdirSync } from 'node:fs';

/**
 * Lowercase slug for upload filenames (matches admin title/slug field).
 * `&` → `and` for safe URLs/paths; non [a-z0-9] → hyphens.
 */
export function slugifyTitleForUploadFilename(source: string): string {
	let s = source.trim().toLowerCase();
	s = s.replace(/&/g, 'and');
	s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return s.slice(0, 72);
}

/** Next free name: `base.webp`, then `base-1.webp`, `base-2.webp`, … */
export function nextSequentialWebpFilename(base: string, dir: string): string {
	mkdirSync(dir, { recursive: true });
	const files = new Set(readdirSync(dir));
	if (!files.has(`${base}.webp`)) return `${base}.webp`;
	let n = 1;
	while (files.has(`${base}-${n}.webp`)) n += 1;
	return `${base}-${n}.webp`;
}

/**
 * Alt text: tour title, or `Title - N` when filename ends with `-N` before extension
 * (e.g. `kakheti-wine-and-village-route-1.webp` → `Title - 1`).
 */
export function tourImageAltFromUrl(displayTitle: string, src: string): string {
	const t = displayTitle.trim() || 'Tour';
	try {
		const pathPart = src.split('?')[0];
		const segment = decodeURIComponent(pathPart.split('/').pop() || '');
		const stem = segment.replace(/\.[^.]+$/i, '');
		const m = stem.match(/^(.*)-(\d+)$/);
		if (m) return `${t} - ${m[2]}`;
		return t;
	} catch {
		return t;
	}
}
