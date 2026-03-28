export const GUIDE_SPECIALTY_IDS = [
	'adventure-hiking',
	'cultural-historical',
	'wine-food',
	'religious-pilgrimage',
	'photography',
	'family-friendly',
	'private-custom',
] as const;

export type GuideSpecialtyId = (typeof GUIDE_SPECIALTY_IDS)[number];

export const GUIDE_SPECIALTY_LABELS_EN: Record<GuideSpecialtyId, string> = {
	'adventure-hiking': 'Adventure & Hiking',
	'cultural-historical': 'Cultural & Historical',
	'wine-food': 'Wine & Food',
	'religious-pilgrimage': 'Religious & Pilgrimage',
	photography: 'Photography',
	'family-friendly': 'Family Friendly',
	'private-custom': 'Private & Custom',
};

export function parseGuideSpecialty(raw: unknown): GuideSpecialtyId | null {
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	return (GUIDE_SPECIALTY_IDS as readonly string[]).includes(t) ? (t as GuideSpecialtyId) : null;
}

export function normalizeGuideSpecialtiesFromRaw(raw: unknown): GuideSpecialtyId[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<GuideSpecialtyId>();
	const out: GuideSpecialtyId[] = [];
	for (const v of raw) {
		const p = parseGuideSpecialty(v);
		if (p && !seen.has(p)) {
			seen.add(p);
			out.push(p);
		}
	}
	return out;
}
