import type { APIRoute } from 'astro';
import type { Locale } from '../../../lib/strings';
import { parseTourCategory, type TourCategoryId } from '../../../lib/tour-categories';
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
	isValidSlug,
	normalizeTourGalleryInput,
	parseTourLocation,
	parseTourLocationFromForm,
	saveTourPost,
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
		i18n[loc] = {
			title,
			duration,
			excerpt,
			price: (fields[`${loc}_price`] ?? '').trim() || null,
			seo_title: (fields[`${loc}_seo_title`] ?? '').trim() || null,
			seo_description: (fields[`${loc}_seo_description`] ?? '').trim() || null,
			body: fields[`${loc}_body`] ?? '',
			contact_sidebar: '',
		};
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

	if (jsonBody) {
		const j = (await request.json()) as Record<string, unknown>;
		const {
			gallery: galleryRaw,
			i18n: i18nRaw,
			location: locationRaw,
			category: categoryRaw,
			physical_rating: physicalRatingRaw,
			driving_distance: drivingDistanceRaw,
			...rest
		} = j;
		fields = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v == null ? '' : String(v)]));
		galleryUrls = normalizeTourGalleryInput(galleryRaw);
		if (i18nRaw && typeof i18nRaw === 'object' && !Array.isArray(i18nRaw)) {
			const i18n: Partial<Record<Locale, TourLocaleBlock>> = {};
			for (const loc of LOCALES) {
				const block = (i18nRaw as Record<string, unknown>)[loc];
				if (!block || typeof block !== 'object') continue;
				const o = block as Record<string, unknown>;
				const title = String(o.title ?? '').trim();
				const duration = String(o.duration ?? '').trim();
				const excerpt = String(o.excerpt ?? '').trim();
				if (!title && !duration && !excerpt) continue;
				i18n[loc] = {
					title,
					duration,
					excerpt,
					price: o.price == null || o.price === '' ? null : String(o.price),
					seo_title: o.seo_title == null || o.seo_title === '' ? null : String(o.seo_title),
					seo_description:
						o.seo_description == null || o.seo_description === '' ? null : String(o.seo_description),
					body: String(o.body ?? ''),
					contact_sidebar: '',
				};
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
			let categoryField: TourCategoryId | null | undefined;
			if (categoryRaw === undefined) {
				categoryField = undefined;
			} else if (categoryRaw === null || categoryRaw === '') {
				categoryField = null;
			} else {
				const parsed = parseTourCategory(categoryRaw);
				if (!parsed) {
					return new Response(JSON.stringify({ error: 'Invalid tour category' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				categoryField = parsed;
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
			const result = saveTourPost({
				id: intent === 'update' ? id : undefined,
				slug,
				image: image || null,
				gallery: galleryUrls,
				location: locationField,
				category: categoryField,
				physical_rating: physicalRatingField,
				driving_distance: drivingDistanceField,
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
					publicUrl: publicContentUrl(request, loc, 'tours', slug),
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	} else {
		const fd = await request.formData();
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

	const catTrim = (fields.category ?? '').trim();
	let categoryFromForm: TourCategoryId | null;
	if (!catTrim) {
		categoryFromForm = null;
	} else {
		const parsed = parseTourCategory(catTrim);
		if (!parsed) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', 'Invalid tour category');
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: 'Invalid tour category' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		categoryFromForm = parsed;
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

	const result = saveTourPost({
		id: intent === 'update' ? id : undefined,
		slug,
		image: image || null,
		gallery: galleryUrls,
		location: locationFromForm,
		category: categoryFromForm,
		physical_rating: physicalRatingFromForm,
		driving_distance: drivingFromForm,
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
				publicUrl: publicContentUrl(request, loc, 'tours', slug),
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
