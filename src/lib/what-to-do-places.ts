import { getRegionPostById, isRegionPostUnderAncestor, type RegionLevel } from './regions-db';
import { flattenTourPostToRow, getAllWhatToDoPosts, isLocale, type TourRow } from './tours-db';
import type { Locale } from './strings';

export type WhatToDoPlaceLink = {
	id: string;
	slug: string;
	level: RegionLevel;
	title: string;
};

/** Resolve region post ids to titles and slugs for the active locale. */
export function resolveWhatToDoPlaceLinks(locale: string, placeIds: string[]): WhatToDoPlaceLink[] {
	if (!isLocale(locale) || !placeIds.length) return [];
	const out: WhatToDoPlaceLink[] = [];
	for (const id of placeIds) {
		const p = getRegionPostById(id);
		if (!p) continue;
		const title =
			p.i18n[locale]?.title?.trim() ||
			p.i18n.en?.title?.trim() ||
			p.i18n.ka?.title?.trim() ||
			p.slug;
		out.push({ id: p.id, slug: p.slug, level: p.level, title });
	}
	return out;
}

/**
 * “What to do” rows to show on a region/municipality/village page: any entry that tags this place
 * or a more specific place inside it (e.g. region page lists posts tagged to a municipality within it).
 */
export function listWhatToDoRowsForPlace(locale: Locale, placeId: string): TourRow[] {
	if (!isLocale(locale) || !placeId.trim()) return [];
	const posts = getAllWhatToDoPosts();
	const out: TourRow[] = [];
	for (const p of posts) {
		const ids = p.place_ids ?? [];
		if (!ids.some((tid) => isRegionPostUnderAncestor(tid, placeId))) continue;
		const row = flattenTourPostToRow(p, locale);
		if (row) out.push(row);
	}
	out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
	return out;
}
