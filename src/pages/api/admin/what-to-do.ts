import type { APIRoute } from 'astro';
import type { Locale } from '../../../lib/strings';
import { parseWhatToDoCategory, type WhatToDoCategoryId } from '../../../lib/what-to-do-categories';
import { parseWhatToDoSeason, type WhatToDoSeasonId } from '../../../lib/what-to-do-seasons';
import {
	parseDrivingDistance,
	parseTourPhysicalRating,
	type TourPhysicalRatingId,
} from '../../../lib/tour-physical-rating';
import {
	parseAdminLocale,
	publicContentUrl,
	isJsonRequestBody,
	wantsJsonApiResponse,
} from '../../../lib/admin-save-response';
import {
	normalizeSocialLinksFromJson,
	parseContactSocialLinksFromFormGlobal,
	trimSocialLinks,
	type ContactSocialLinks,
} from '../../../lib/contact-social-links';
import { parseGoogleMapsDirectionsUrl } from '../../../lib/google-maps-urls';
import { filterValidRegionIds } from '../../../lib/regions-db';
import {
	isValidSlug,
	normalizeTourGalleryInput,
	parseTourLocation,
	parseTourLocationFromForm,
	saveWhatToDoPost,
	type TourLocaleBlock,
	type TourLocation,
} from '../../../lib/tours-db';

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

function buildI18nFromFields(fields: Record<string, string>): Partial<Record<Locale, TourLocaleBlock>> {
	const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const title = (fields[`${loc}_title`] ?? '').trim();
		const duration = (fields[`${loc}_duration`] ?? '').trim();
		const excerpt = (fields[`${loc}_excerpt`] ?? '').trim();
		if (!title && !duration && !excerpt) continue;
		const block: TourLocaleBlock = {
			title,
			duration,
			excerpt,
			price: (fields[`${loc}_price`] ?? '').trim() || null,
			seo_title: (fields[`${loc}_seo_title`] ?? '').trim() || null,
			seo_description: (fields[`${loc}_seo_description`] ?? '').trim() || null,
			body: fields[`${loc}_body`] ?? '',
			contact_sidebar: fields[`${loc}_contact_sidebar`] ?? '',
		};
		i18n[loc] = block;
	}
	return i18n;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const ct = request.headers.get('content-type') ?? '';
	const jsonBody = isJsonRequestBody(ct);
	const respondJson = wantsJsonApiResponse(request, jsonBody);

	let fields: Record<string, string> = {};
	let galleryUrls: string[] = [];
	let multipartFd: FormData | undefined;

	if (jsonBody) {
		const j = (await request.json()) as Record<string, unknown>;
		const {
			gallery: galleryRaw,
			i18n: i18nRaw,
			location: locationRaw,
			categories: categoriesJsonRaw,
			category: legacyCategoryRaw,
			seasons: seasonsJsonRaw,
			season: legacySeasonRaw,
			physical_rating: physicalRatingRaw,
			driving_distance: drivingDistanceRaw,
			google_directions_url: googleDirectionsRaw,
			social_links: socialLinksJsonRaw,
			place_ids: placeIdsJsonRaw,
			...rest
		} = j;
		fields = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v == null ? '' : String(v)]));
		galleryUrls = normalizeTourGalleryInput(galleryRaw);
		if (i18nRaw && typeof i18nRaw === 'object' && !Array.isArray(i18nRaw)) {
			const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
			for (const loc of LOCALES) {
				const rawBlock = (i18nRaw as Record<string, unknown>)[loc];
				if (!rawBlock || typeof rawBlock !== 'object') continue;
				const o = rawBlock as Record<string, unknown>;
				const title = String(o.title ?? '').trim();
				const duration = String(o.duration ?? '').trim();
				const excerpt = String(o.excerpt ?? '').trim();
				if (!title && !duration && !excerpt) continue;
				const localeBlock: TourLocaleBlock = {
					title,
					duration,
					excerpt,
					price: o.price == null || o.price === '' ? null : String(o.price),
					seo_title: o.seo_title == null || o.seo_title === '' ? null : String(o.seo_title),
					seo_description:
						o.seo_description == null || o.seo_description === '' ? null : String(o.seo_description),
					body: String(o.body ?? ''),
					contact_sidebar: String(o.contact_sidebar ?? ''),
				};
				i18n[loc] = localeBlock;
			}
			const intent = fields.intent === 'update' ? 'update' : 'create';
			const slug = fields.slug?.trim();
			const id = fields.id?.trim();
			const image = fields.image?.trim();
			if (!slug || !isValidSlug(slug)) {
				return new Response(JSON.stringify({ error: 'Invalid or missing slug' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			let locationField: TourLocation | null | undefined;
			if (locationRaw === undefined) {
				locationField = undefined;
			} else if (locationRaw === null) {
				locationField = null;
			} else {
				const parsed = parseTourLocation(locationRaw);
				if (!parsed) {
					return new Response(
						JSON.stringify({
							error: 'Invalid location: expected { lat, lng } (numbers) and optional label (string)',
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } },
					);
				}
				locationField = parsed;
			}
			let whatDoCategoriesField: WhatToDoCategoryId[] | undefined;
			if (categoriesJsonRaw !== undefined) {
				if (!Array.isArray(categoriesJsonRaw)) {
					return new Response(JSON.stringify({ error: 'categories must be an array of category ids' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				const seen = new Set<string>();
				const parsed: WhatToDoCategoryId[] = [];
				for (const el of categoriesJsonRaw) {
					const p = parseWhatToDoCategory(el);
					if (!p) {
						return new Response(JSON.stringify({ error: 'Invalid what-to-do category in categories' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					if (seen.has(p)) continue;
					seen.add(p);
					parsed.push(p);
				}
				whatDoCategoriesField = parsed;
			} else if (legacyCategoryRaw !== undefined) {
				if (legacyCategoryRaw === null || legacyCategoryRaw === '') {
					whatDoCategoriesField = [];
				} else {
					const p = parseWhatToDoCategory(legacyCategoryRaw);
					if (!p) {
						return new Response(JSON.stringify({ error: 'Invalid what-to-do category' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					whatDoCategoriesField = [p];
				}
			}
			let whatDoSeasonsField: WhatToDoSeasonId[] | undefined;
			if (seasonsJsonRaw !== undefined) {
				if (!Array.isArray(seasonsJsonRaw)) {
					return new Response(JSON.stringify({ error: 'seasons must be an array of season ids' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				const seenS = new Set<string>();
				const parsedS: WhatToDoSeasonId[] = [];
				for (const el of seasonsJsonRaw) {
					const p = parseWhatToDoSeason(el);
					if (!p) {
						return new Response(JSON.stringify({ error: 'Invalid what-to-do season in seasons' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					if (seenS.has(p)) continue;
					seenS.add(p);
					parsedS.push(p);
				}
				whatDoSeasonsField = parsedS;
			} else if (legacySeasonRaw !== undefined) {
				if (legacySeasonRaw === null || legacySeasonRaw === '') {
					whatDoSeasonsField = [];
				} else {
					const p = parseWhatToDoSeason(legacySeasonRaw);
					if (!p) {
						return new Response(JSON.stringify({ error: 'Invalid season' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					whatDoSeasonsField = [p];
				}
			}
			let placeIdsField: string[] | undefined;
			if (placeIdsJsonRaw !== undefined) {
				if (!Array.isArray(placeIdsJsonRaw)) {
					return new Response(JSON.stringify({ error: 'place_ids must be an array of region post ids' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				const seenP = new Set<string>();
				const parsedP: string[] = [];
				for (const el of placeIdsJsonRaw) {
					if (typeof el !== 'string') continue;
					const id = el.trim();
					if (!id) continue;
					if (seenP.has(id)) continue;
					seenP.add(id);
					parsedP.push(id);
				}
				placeIdsField = filterValidRegionIds(parsedP);
			}
			let physicalRatingField: TourPhysicalRatingId | null | undefined;
			if (physicalRatingRaw === undefined) {
				physicalRatingField = undefined;
			} else if (physicalRatingRaw === null || physicalRatingRaw === '') {
				physicalRatingField = null;
			} else {
				const parsed = parseTourPhysicalRating(physicalRatingRaw);
				if (!parsed) {
					return new Response(JSON.stringify({ error: 'Invalid physical rating (easy, moderate, hard)' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				physicalRatingField = parsed;
			}
			let drivingDistanceField: string | null | undefined;
			if (drivingDistanceRaw === undefined) {
				drivingDistanceField = undefined;
			} else if (drivingDistanceRaw === null) {
				drivingDistanceField = null;
			} else {
				drivingDistanceField = parseDrivingDistance(
					typeof drivingDistanceRaw === 'string' ? drivingDistanceRaw : String(drivingDistanceRaw),
				);
			}
			let googleDirectionsField: string | null | undefined;
			if (googleDirectionsRaw === undefined) {
				googleDirectionsField = undefined;
			} else if (googleDirectionsRaw === null || googleDirectionsRaw === '') {
				googleDirectionsField = null;
			} else {
				const s =
					typeof googleDirectionsRaw === 'string' ? googleDirectionsRaw.trim() : String(googleDirectionsRaw).trim();
				const parsed = parseGoogleMapsDirectionsUrl(s);
				if (!parsed) {
					return new Response(
						JSON.stringify({
							error:
								'Invalid Google Maps directions URL — use a link from maps.google.com, google.com/maps, or goo.gl',
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } },
					);
				}
				googleDirectionsField = parsed;
			}
			let socialLinksField: ContactSocialLinks | undefined;
			if (socialLinksJsonRaw !== undefined) {
				socialLinksField = trimSocialLinks(normalizeSocialLinksFromJson(socialLinksJsonRaw) ?? {});
			}
			const result = saveWhatToDoPost({
				id: intent === 'update' ? id : undefined,
				slug,
				image: image || null,
				gallery: galleryUrls,
				location: locationField,
				whatDoCategories: whatDoCategoriesField,
				whatDoSeasons: whatDoSeasonsField,
				place_ids: placeIdsField,
				physical_rating: physicalRatingField,
				driving_distance: drivingDistanceField,
				google_directions_url: googleDirectionsField,
				social_links: socialLinksField,
				i18n,
				mode: intent === 'update' ? 'update' : 'create',
			});
			if (!result.ok) {
				return new Response(JSON.stringify({ error: result.error }), {
					status: intent === 'create' ? 409 : 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const loc = parseAdminLocale(fields);
			return new Response(
				JSON.stringify({
					ok: true,
					publicUrl: publicContentUrl(request, loc, 'what-to-do', slug),
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	} else {
		const fd = await request.formData();
		multipartFd = fd;
		fields = Object.fromEntries(
			[...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
		);
		const gu = fd.get('gallery_urls');
		galleryUrls = typeof gu === 'string' ? normalizeTourGalleryInput(gu) : [];
	}

	const intent = fields.intent === 'update' ? 'update' : 'create';
	const slug = fields.slug?.trim();
	const id = fields.id?.trim();
	const image = fields.image?.trim();

	if (!slug || !isValidSlug(slug)) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', 'Invalid or missing slug');
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: 'Invalid or missing slug' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const i18n = buildI18nFromFields(fields);

	const locParsed = parseTourLocationFromForm(fields);
	if (locParsed.kind === 'error') {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', locParsed.message);
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: locParsed.message }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const locationFromForm =
		locParsed.kind === 'empty' ? null : locParsed.value;

	let whatDoCategoriesFromMultipart: WhatToDoCategoryId[] | undefined;
	if (multipartFd) {
		const seen = new Set<string>();
		const out: WhatToDoCategoryId[] = [];
		for (const v of multipartFd.getAll('categories')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			const parsed = parseWhatToDoCategory(t);
			if (!parsed) {
				if (!respondJson) {
					const back = fields.redirect?.trim() || `/en/admin`;
					const u = new URL(back, request.url);
					u.searchParams.set('error', 'Invalid what-to-do category');
					return Response.redirect(u.toString(), 303);
				}
				return new Response(JSON.stringify({ error: 'Invalid what-to-do category' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (seen.has(parsed)) continue;
			seen.add(parsed);
			out.push(parsed);
		}
		whatDoCategoriesFromMultipart = out;
	}

	let whatDoSeasonsFromMultipart: WhatToDoSeasonId[] | undefined;
	if (multipartFd) {
		const seenSe = new Set<string>();
		const outSe: WhatToDoSeasonId[] = [];
		for (const v of multipartFd.getAll('seasons')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			const parsed = parseWhatToDoSeason(t);
			if (!parsed) {
				if (!respondJson) {
					const back = fields.redirect?.trim() || `/en/admin`;
					const u = new URL(back, request.url);
					u.searchParams.set('error', 'Invalid season');
					return Response.redirect(u.toString(), 303);
				}
				return new Response(JSON.stringify({ error: 'Invalid season' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (seenSe.has(parsed)) continue;
			seenSe.add(parsed);
			outSe.push(parsed);
		}
		whatDoSeasonsFromMultipart = outSe;
	}

	let placeIdsFromMultipart: string[] | undefined;
	if (multipartFd) {
		const seenPl = new Set<string>();
		const outPl: string[] = [];
		for (const v of multipartFd.getAll('place_ids')) {
			if (typeof v !== 'string') continue;
			const t = v.trim();
			if (!t) continue;
			if (seenPl.has(t)) continue;
			seenPl.add(t);
			outPl.push(t);
		}
		placeIdsFromMultipart = filterValidRegionIds(outPl);
	}

	const physTrim = (fields.physical_rating ?? '').trim();
	let physicalRatingFromForm: TourPhysicalRatingId | null;
	if (!physTrim) {
		physicalRatingFromForm = null;
	} else {
		const parsed = parseTourPhysicalRating(physTrim);
		if (!parsed) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', 'Invalid physical rating');
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: 'Invalid physical rating' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		physicalRatingFromForm = parsed;
	}

	const drivingFromForm = parseDrivingDistance(fields.driving_distance ?? '');

	const directionsTrim = (fields.google_directions_url ?? '').trim();
	let directionsParsed: string | null;
	if (!directionsTrim) {
		directionsParsed = null;
	} else {
		const parsed = parseGoogleMapsDirectionsUrl(directionsTrim);
		if (!parsed) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set(
					'error',
					'Invalid Google Maps URL — use maps.google.com, google.com/maps, or a goo.gl link',
				);
				return Response.redirect(u.toString(), 303);
			}
			return new Response(
				JSON.stringify({
					error:
						'Invalid Google Maps URL — use maps.google.com, google.com/maps, or a goo.gl link',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}
		directionsParsed = parsed;
	}

	const socialFromForm = parseContactSocialLinksFromFormGlobal(fields);

	const result = saveWhatToDoPost({
		id: intent === 'update' ? id : undefined,
		slug,
		image: image || null,
		gallery: galleryUrls,
		location: locationFromForm,
		whatDoCategories: whatDoCategoriesFromMultipart,
		whatDoSeasons: whatDoSeasonsFromMultipart,
		place_ids: placeIdsFromMultipart,
		physical_rating: physicalRatingFromForm,
		driving_distance: drivingFromForm,
		google_directions_url: directionsParsed,
		social_links: socialFromForm,
		i18n,
		mode: intent === 'update' ? 'update' : 'create',
	});

	if (!result.ok) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', result.error);
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: result.error }), {
			status: intent === 'create' ? 409 : 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (respondJson) {
		const loc = parseAdminLocale(fields);
		return new Response(
			JSON.stringify({
				ok: true,
				publicUrl: publicContentUrl(request, loc, 'what-to-do', slug),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const back = fields.redirect?.trim() || `/en/admin`;
	return Response.redirect(new URL(back, request.url).toString(), 303);
};
