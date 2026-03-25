/** Stored on each tour post (shared across locales). */
export const PHYSICAL_RATING_IDS = ['easy', 'moderate', 'hard'] as const;
export type TourPhysicalRatingId = (typeof PHYSICAL_RATING_IDS)[number];

export const PHYSICAL_RATING_LABELS_EN: Record<TourPhysicalRatingId, string> = {
	easy: 'Easy',
	moderate: 'Moderate',
	hard: 'Hard',
};

export function isTourPhysicalRatingId(s: string): s is TourPhysicalRatingId {
	return (PHYSICAL_RATING_IDS as readonly string[]).includes(s);
}

export function parseTourPhysicalRating(raw: unknown): TourPhysicalRatingId | null {
	if (raw == null || raw === '') return null;
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	return isTourPhysicalRatingId(t) ? t : null;
}

/** Free-text driving distance (e.g. "120 km", "approx. 95 km one way"). */
export function parseDrivingDistance(raw: unknown): string | null {
	if (raw == null || raw === '') return null;
	if (typeof raw !== 'string') return null;
	const t = raw.trim().replace(/\s+/g, ' ');
	if (!t) return null;
	return t.slice(0, 240);
}
