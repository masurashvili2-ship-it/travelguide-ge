/**
 * SVG map pins for Leaflet: one shared style for all tours, distinct “theme” per what-to-do category.
 */
import type { WhatToDoCategoryId } from './what-to-do-categories';
import { WHAT_TO_DO_CATEGORY_IDS } from './what-to-do-categories';

const TOUR_PIN = '#0d9488';

/** Fill color per what-to-do category (pin body). */
const WTD_PIN_COLORS: Record<WhatToDoCategoryId, string> = {
	'hot-spring': '#ea580c',
	lake: '#0284c7',
	river: '#0369a1',
	'state-nature-reserve': '#15803d',
	park: '#22c55e',
	'mountain-peaks': '#57534e',
	'national-park': '#166534',
	'natural-monument': '#78716c',
	reservoir: '#0e7490',
	hiking: '#ca8a04',
	street: '#64748b',
	'history-culture': '#9333ea',
	'archaeological-site': '#a16207',
	cathedral: '#4f46e5',
	monastery: '#6366f1',
	'pilgrimage-site': '#7c3aed',
	church: '#4338ca',
	fortress: '#b91c1c',
	museum: '#0f766e',
	landmark: '#db2777',
	statue: '#c026d3',
};

/** Simple 18×18 stroke icons (path in 0–18 coords), drawn in pin “hole” on white disc. */
const WTD_INNER_PATH: Record<WhatToDoCategoryId, string> = {
	'hot-spring':
		'<circle cx="9" cy="10" r="3" fill="none" stroke-width="1.8"/><path d="M9 4v2M7 4.5 Q9 6 11 4.5" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	lake: '<path d="M2 11 Q9 8 16 11 Q9 14 2 11Z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
	river:
		'<path d="M3 6c2 2 4-2 6 0s4-2 6 0 4-2 6 0M3 12c2 2 4-2 6 0s4-2 6 0 4-2 6 0" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	'state-nature-reserve':
		'<path d="M9 3 L14 8 L12 15 L6 15 L4 8 Z" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
	park: '<path d="M9 3 L12 9 L9 8 L6 9 Z M5 15h8" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
	'mountain-peaks':
		'<path d="M2 14 L6 6 L9 10 L12 5 L16 14 Z" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
	'national-park':
		'<path d="M3 14 L7 7 L10 11 L13 6 L15 14 Z" fill="none" stroke-width="1.5" stroke-linejoin="round"/><circle cx="14" cy="5" r="1.2" fill="currentColor"/>',
	'natural-monument':
		'<path d="M5 14 L8 5 L11 14 M8 5 L11 5 L14 14" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	reservoir:
		'<path d="M3 10h12M3 10v4h12v-4M6 10V7h6v3" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
	hiking:
		'<circle cx="7" cy="5" r="1.8" fill="none" stroke-width="1.5"/><path d="M5 14 L7 8 L9 8 L11 14 M7 8 L6 11" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	street:
		'<path d="M4 4h10v10H4z M4 8h10 M8 4v10" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	'history-culture':
		'<path d="M4 14V6l5-2 5 2v8M4 10h10" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	'archaeological-site':
		'<path d="M3 14h12 M5 14 L7 8h4l2 6" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	cathedral:
		'<path d="M9 3 L9 6 M5 6h8v8H5z M7 10h4" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
	monastery:
		'<path d="M5 14V7l4-3 4 3v7 M7 14v-4h4v4" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	'pilgrimage-site':
		'<path d="M9 3 L9 14 M6 6 L12 10 M12 6 L6 10" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	church:
		'<path d="M9 3v3 M6 6h6 M7 6V14h4V6" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
	fortress:
		'<path d="M4 14V8l2-2V5h6v1l2 2v6 M7 11h4" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	museum:
		'<path d="M4 14V7l5-2 5 2v7 M7 10h4v4H7z" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	landmark:
		'<path d="M9 4l1.5 4h4l-3 2.5 1 4L9 12 5.5 14.5l1-4L3.5 8h4z" fill="none" stroke-width="1.3" stroke-linejoin="round"/>',
	statue:
		'<circle cx="9" cy="6" r="2" fill="none" stroke-width="1.5"/><path d="M5 14c0-3 8-3 8 0" fill="none" stroke-width="1.5"/>',
};

const TOUR_INNER =
	'<path d="M2 12 Q5 4 9 7 Q13 4 16 12" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="13" r="1.6" fill="currentColor"/>';

function svgPinDataUrl(fill: string, innerSvg: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
  <path fill="${fill}" d="M18 2C10.82 2 5 7.37 5 14.5c0 6.5 11 24.5 13 28 2-3.5 13-21.5 13-28C31 7.37 25.18 2 18 2z"/>
  <circle cx="18" cy="15" r="10" fill="#fff"/>
  <g stroke="${fill}" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(9 6)">${innerSvg}</g>
</svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function tourMapPinDataUrl(): string {
	return svgPinDataUrl(TOUR_PIN, TOUR_INNER.replace(/currentColor/g, TOUR_PIN));
}

export function whatToDoMapPinDataUrl(categoryId: string): string {
	const id = (WHAT_TO_DO_CATEGORY_IDS as readonly string[]).includes(categoryId)
		? (categoryId as WhatToDoCategoryId)
		: 'landmark';
	const fill = WTD_PIN_COLORS[id];
	const inner = WTD_INNER_PATH[id].replace(/currentColor/g, fill);
	return svgPinDataUrl(fill, inner);
}

/** Administrative geography: region, municipality, or village (distinct pin colors). */
const GEO_REGION = '#7c3aed';
const GEO_MUNICIPALITY = '#2563eb';
const GEO_VILLAGE = '#059669';
const GEO_INNER: Record<'region' | 'municipality' | 'village', string> = {
	region:
		'<rect x="3" y="4" width="12" height="10" rx="1.5" fill="none" stroke-width="1.5"/><path d="M3 8h12M8 4v10" fill="none" stroke-width="1.2"/>',
	municipality:
		'<path d="M4 14V7l5-3 5 3v7 M7 10h4v4H7z" fill="none" stroke-width="1.4" stroke-linejoin="round"/>',
	village:
		'<path d="M5 14V8l4-3 4 3v6 M8 10h2v4H8z" fill="none" stroke-width="1.4" stroke-linejoin="round"/><circle cx="13" cy="6" r="1.3" fill="currentColor"/>',
};

export function regionMapPinDataUrl(level: 'region' | 'municipality' | 'village'): string {
	const fill = level === 'region' ? GEO_REGION : level === 'municipality' ? GEO_MUNICIPALITY : GEO_VILLAGE;
	const inner = GEO_INNER[level].replace(/currentColor/g, fill);
	return svgPinDataUrl(fill, inner);
}
