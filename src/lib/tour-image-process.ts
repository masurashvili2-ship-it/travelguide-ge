import sharp from 'sharp';

/** Max dimensions when downscaling (Full HD bounding box, preserve aspect ratio). */
const FHD_W = 1920;
const FHD_H = 1080;

export const TOUR_WATERMARK_TEXT = 'TRAVELGUIDE.GE';

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function watermarkOverlaySvg(width: number, height: number): Buffer {
	const fs = Math.round(Math.max(11, Math.min(34, Math.min(width, height) * 0.032)));
	const padX = Math.round(fs * 0.75);
	const padY = Math.round(fs * 0.55);
	const text = escapeXml(TOUR_WATERMARK_TEXT);
	const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="wm" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.85"/>
    </filter>
  </defs>
  <text filter="url(#wm)" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700" font-size="${fs}px" text-anchor="end" x="${width - padX}" y="${height - padY}">${text}</text>
</svg>`;
	return Buffer.from(svg);
}

/**
 * Auto-orient, downscale if wider than 1920 or taller than 1080 (fit inside),
 * burn bottom-right watermark, encode WebP.
 */
export async function processTourImageToWebp(buffer: Buffer): Promise<Buffer> {
	let pipeline = sharp(buffer).rotate();

	const meta = await pipeline.metadata();
	const w = meta.width ?? 0;
	const h = meta.height ?? 0;
	if (!w || !h) {
		throw new Error('Could not read image dimensions');
	}

	const exceeds = w > FHD_W || h > FHD_H;
	if (exceeds) {
		pipeline = pipeline.resize({
			width: FHD_W,
			height: FHD_H,
			fit: 'inside',
			withoutEnlargement: true,
		});
	}

	const { data, info } = await pipeline.ensureAlpha().png().toBuffer({ resolveWithObject: true });
	const overlay = watermarkOverlaySvg(info.width, info.height);

	return sharp(data)
		.composite([{ input: overlay, top: 0, left: 0, blend: 'over' }])
		.webp({ quality: 86, effort: 4 })
		.toBuffer();
}
