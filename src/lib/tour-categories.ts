/** Stable ids stored in `data/tours.json`; labels are translated in `strings.ts`. */
export const TOUR_CATEGORY_IDS = [
	'cultural-historical',
	'wine-food',
	'adventure-nature',
	'mountain-ski',
	'religious-pilgrimage',
	'off-road',
	'self-driving',
	'self-guided',
] as const;

export type TourCategoryId = (typeof TOUR_CATEGORY_IDS)[number];

/** English labels for admin & fallback */
export const TOUR_CATEGORY_LABELS_EN: Record<TourCategoryId, string> = {
	'cultural-historical': 'Cultural & Historical',
	'wine-food': 'Wine & Food',
	'adventure-nature': 'Adventure & Nature',
	'mountain-ski': 'Mountain & Ski',
	'religious-pilgrimage': 'Religious & Pilgrimage',
	'off-road': 'Off-road',
	'self-driving': 'Self Driving',
	'self-guided': 'Self Guided',
};

export function isTourCategoryId(s: string): s is TourCategoryId {
	return (TOUR_CATEGORY_IDS as readonly string[]).includes(s);
}

export function parseTourCategory(raw: unknown): TourCategoryId | null {
	if (raw == null || raw === '') return null;
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	return isTourCategoryId(t) ? t : null;
}
