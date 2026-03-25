/**
 * Categories for “What to do” only (stored in what-to-do.json).
 * Tours keep separate ids in tour-categories.ts.
 */
export const WHAT_TO_DO_CATEGORY_IDS = [
	'hot-spring',
	'lake',
	'river',
	'state-nature-reserve',
	'park',
	'mountain-peaks',
	'national-park',
	'natural-monument',
	'reservoir',
	'hiking',
	'street',
	'history-culture',
	'archaeological-site',
	'cathedral',
	'monastery',
	'pilgrimage-site',
	'church',
	'fortress',
	'museum',
	'landmark',
	'statue',
] as const;

export type WhatToDoCategoryId = (typeof WHAT_TO_DO_CATEGORY_IDS)[number];

/** English labels for admin & fallback */
export const WHAT_TO_DO_CATEGORY_LABELS_EN: Record<WhatToDoCategoryId, string> = {
	'hot-spring': 'Hot Spring',
	lake: 'Lake',
	river: 'River',
	'state-nature-reserve': 'State Nature Reserve',
	park: 'Park',
	'mountain-peaks': 'Mountain Peaks',
	'national-park': 'National Park',
	'natural-monument': 'Natural Monument',
	reservoir: 'Reservoir',
	hiking: 'Hiking',
	street: 'Street',
	'history-culture': 'History & Culture',
	'archaeological-site': 'Archaeological Site',
	cathedral: 'Cathedral',
	monastery: 'Monastery',
	'pilgrimage-site': 'Pilgrimage Site',
	church: 'Church',
	fortress: 'Fortress',
	museum: 'Museum',
	landmark: 'Landmark',
	statue: 'Statue',
};

/** Older what-to-do rows used tour category ids; map to the closest new id. */
const LEGACY_FROM_TOUR_CATEGORY: Record<string, WhatToDoCategoryId> = {
	'cultural-historical': 'history-culture',
	'wine-food': 'landmark',
	'adventure-nature': 'hiking',
	'mountain-ski': 'mountain-peaks',
	'religious-pilgrimage': 'pilgrimage-site',
	'off-road': 'hiking',
	'self-driving': 'street',
	'self-guided': 'street',
};

export function isWhatToDoCategoryId(s: string): s is WhatToDoCategoryId {
	return (WHAT_TO_DO_CATEGORY_IDS as readonly string[]).includes(s);
}

export function parseWhatToDoCategory(raw: unknown): WhatToDoCategoryId | null {
	if (raw == null || raw === '') return null;
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	if (isWhatToDoCategoryId(t)) return t;
	const mapped = LEGACY_FROM_TOUR_CATEGORY[t];
	return mapped ?? null;
}

/** Parse `categories` JSON array; if empty, fall back to legacy single `category` string. */
export function normalizeWhatToDoCategoriesFromRaw(
	categoriesRaw: unknown,
	legacyCategoryRaw: unknown,
): WhatToDoCategoryId[] {
	const out: WhatToDoCategoryId[] = [];
	const seen = new Set<WhatToDoCategoryId>();
	if (Array.isArray(categoriesRaw)) {
		for (const el of categoriesRaw) {
			const p = parseWhatToDoCategory(el);
			if (p && !seen.has(p)) {
				seen.add(p);
				out.push(p);
			}
		}
	}
	if (out.length === 0) {
		const one = parseWhatToDoCategory(legacyCategoryRaw);
		if (one) out.push(one);
	}
	return out;
}
