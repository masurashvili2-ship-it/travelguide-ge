import { buildPageI18nFromContributeForm, buildTourI18nFromContributeForm } from './contribute-form-fields';
import { parseWhatToDoCategory, type WhatToDoCategoryId } from './what-to-do-categories';
import { parseWhatToDoSeason, type WhatToDoSeasonId } from './what-to-do-seasons';
import {
	parseDrivingDistance,
	parseTourPhysicalRating,
	type TourPhysicalRatingId,
} from './tour-physical-rating';
import { parseContactSocialLinksFromFormGlobal, trimSocialLinks } from './contact-social-links';
import { parseTourCategory, type TourCategoryId } from './tour-categories';
import { parseGoogleMapsDirectionsUrl } from './google-maps-urls';
import {
	isValidSlug,
	normalizeTourGalleryInput,
	parseTourLocationFromForm,
} from './tours-db';
import { filterValidRegionIds } from './regions-db';
import type { PageSubmissionPayload, TourLikeSubmissionPayload } from './submissions-db';

export function formFieldsFromFormData(fd: FormData): Record<string, string> {
	return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
}

export function parseTourLikeContributionPayload(
	fd: FormData,
	kind: 'tours' | 'what-to-do',
): { ok: true; payload: TourLikeSubmissionPayload } | { ok: false; error: string } {
	const fields = formFieldsFromFormData(fd);
	const gu = fd.get('gallery_urls');
	const galleryUrls = typeof gu === 'string' ? normalizeTourGalleryInput(gu) : [];

	const slug = fields.slug?.trim();
	const image = fields.image?.trim();

	if (!slug || !isValidSlug(slug)) {
		return { ok: false, error: 'Invalid or missing slug' };
	}

	const i18n = buildTourI18nFromContributeForm(fields, {
		contactSidebar: kind === 'what-to-do',
	});
	const social_links =
		kind === 'what-to-do' ? parseContactSocialLinksFromFormGlobal(fields) : trimSocialLinks({});

	const locParsed = parseTourLocationFromForm(fields);
	if (locParsed.kind === 'error') {
		return { ok: false, error: locParsed.message };
	}
	const locationFromForm = locParsed.kind === 'empty' ? null : locParsed.value;

	let categoryFromForm: TourCategoryId | null = null;
	let whatDoCategories: WhatToDoCategoryId[] = [];
	let whatDoSeasons: WhatToDoSeasonId[] = [];
	let placeIdsFromForm: string[] = [];

	if (kind === 'tours') {
		const catTrim = (fields.category ?? '').trim();
		if (catTrim) {
			const parsed = parseTourCategory(catTrim);
			if (!parsed) return { ok: false, error: 'Invalid tour category' };
			categoryFromForm = parsed;
		}
	} else {
		const seen = new Set<string>();
		for (const v of fd.getAll('categories')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			const parsed = parseWhatToDoCategory(t);
			if (!parsed) return { ok: false, error: 'Invalid what-to-do category' };
			if (seen.has(parsed)) continue;
			seen.add(parsed);
			whatDoCategories.push(parsed);
		}
		const seenSe = new Set<string>();
		for (const v of fd.getAll('seasons')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			const parsed = parseWhatToDoSeason(t);
			if (!parsed) return { ok: false, error: 'Invalid season' };
			if (seenSe.has(parsed)) continue;
			seenSe.add(parsed);
			whatDoSeasons.push(parsed);
		}
		const seenPl = new Set<string>();
		for (const v of fd.getAll('place_ids')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			if (seenPl.has(t)) continue;
			seenPl.add(t);
			placeIdsFromForm.push(t);
		}
		placeIdsFromForm = filterValidRegionIds(placeIdsFromForm);
	}

	const physTrim = (fields.physical_rating ?? '').trim();
	let physicalRatingFromForm: TourPhysicalRatingId | null;
	if (!physTrim) {
		physicalRatingFromForm = null;
	} else {
		const parsed = parseTourPhysicalRating(physTrim);
		if (!parsed) return { ok: false, error: 'Invalid physical rating' };
		physicalRatingFromForm = parsed;
	}

	const drivingFromForm = parseDrivingDistance(fields.driving_distance ?? '');

	let googleDirections: string | null = null;
	if (kind === 'what-to-do') {
		const dTrim = (fields.google_directions_url ?? '').trim();
		if (dTrim) {
			const parsed = parseGoogleMapsDirectionsUrl(dTrim);
			if (!parsed) {
				return {
					ok: false,
					error:
						'Invalid Google Maps URL — use maps.google.com, google.com/maps, or a goo.gl link',
				};
			}
			googleDirections = parsed;
		}
	}

	return {
		ok: true,
		payload: {
			slug,
			image: image || null,
			gallery: galleryUrls,
			location: locationFromForm,
			category: categoryFromForm,
			whatDoCategories,
			whatDoSeasons,
			place_ids: kind === 'what-to-do' ? placeIdsFromForm : [],
			physical_rating: physicalRatingFromForm,
			driving_distance: drivingFromForm,
			google_directions_url: googleDirections,
			social_links,
			i18n,
		},
	};
}

export function parsePageContributionPayloadFromFormData(
	fd: FormData,
): { ok: true; payload: PageSubmissionPayload } | { ok: false; error: string } {
	const fields = formFieldsFromFormData(fd);
	const slug = fields.slug?.trim() ?? '';
	const sortRaw = fields.sort_order?.trim();
	const sort_order = sortRaw === '' || sortRaw === undefined ? 0 : Number.parseInt(sortRaw, 10);

	if (!slug || !isValidSlug(slug)) {
		return { ok: false, error: 'Invalid or missing slug' };
	}

	const i18n = buildPageI18nFromContributeForm(fields);

	return {
		ok: true,
		payload: {
			slug,
			sort_order: Number.isFinite(sort_order) ? sort_order : 0,
			i18n,
		},
	};
}
