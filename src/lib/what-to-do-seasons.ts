/** Best time / season for “What to do” entries (what-to-do.json only). */
export const WHAT_TO_DO_SEASON_IDS = ['winter', 'spring', 'summer', 'autumn'] as const;

export type WhatToDoSeasonId = (typeof WHAT_TO_DO_SEASON_IDS)[number];

export const WHAT_TO_DO_SEASON_LABELS_EN: Record<WhatToDoSeasonId, string> = {
	winter: 'Winter',
	spring: 'Spring',
	summer: 'Summer',
	autumn: 'Autumn',
};

export function isWhatToDoSeasonId(s: string): s is WhatToDoSeasonId {
	return (WHAT_TO_DO_SEASON_IDS as readonly string[]).includes(s);
}

export function parseWhatToDoSeason(raw: unknown): WhatToDoSeasonId | null {
	if (raw == null || raw === '') return null;
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	return isWhatToDoSeasonId(t) ? t : null;
}

/** Parse `seasons` JSON array; if empty, fall back to legacy single `season` string. */
export function normalizeWhatToDoSeasonsFromRaw(
	seasonsRaw: unknown,
	legacySeasonRaw: unknown,
): WhatToDoSeasonId[] {
	const out: WhatToDoSeasonId[] = [];
	const seen = new Set<WhatToDoSeasonId>();
	if (Array.isArray(seasonsRaw)) {
		for (const el of seasonsRaw) {
			const p = parseWhatToDoSeason(el);
			if (p && !seen.has(p)) {
				seen.add(p);
				out.push(p);
			}
		}
	}
	if (out.length === 0) {
		const one = parseWhatToDoSeason(legacySeasonRaw);
		if (one) out.push(one);
	}
	return out;
}
