import type { APIRoute } from 'astro';
import type { Locale } from '../../../lib/strings';
import {
	isJsonRequestBody,
	parseAdminLocale,
	publicContentUrl,
	wantsJsonApiResponse,
} from '../../../lib/admin-save-response';
import {
	isValidSlug,
	isValidTourId,
	normalizeTourGalleryInput,
	parseTourLocation,
	parseTourLocationFromForm,
	type TourLocation,
} from '../../../lib/tours-db';
import {
	deleteRegionPost,
	parseOptionalNumberField,
	parseRegionLevel,
	saveRegionPost,
	type RegionLocaleBlock,
	type RegionLevel,
} from '../../../lib/regions-db';

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

function buildI18nFromFields(fields: Record<string, string>): Partial<Record<Locale, RegionLocaleBlock>> {
	const i18n: Partial<Record<Locale, RegionLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const title = (fields[`${loc}_title`] ?? '').trim();
		const excerpt = (fields[`${loc}_excerpt`] ?? '').trim();
		if (!title && !excerpt) continue;
		i18n[loc] = {
			title,
			subtitle: (fields[`${loc}_subtitle`] ?? '').trim() || null,
			excerpt,
			seo_title: (fields[`${loc}_seo_title`] ?? '').trim() || null,
			seo_description: (fields[`${loc}_seo_description`] ?? '').trim() || null,
			body: fields[`${loc}_body`] ?? '',
		};
	}
	return i18n;
}

function parseLevelAndParent(fields: Record<string, string>): {
	ok: true;
	level: RegionLevel;
	parent_id: string | null;
} | { ok: false; error: string } {
	const level = parseRegionLevel(fields.level ?? '');
	if (!level) {
		return { ok: false, error: 'Select a type: region, municipality, or village' };
	}
	const parentTrim = (fields.parent_id ?? '').trim();
	if (level === 'region') {
		return { ok: true, level, parent_id: null };
	}
	if (!parentTrim) {
		return { ok: false, error: 'Choose a parent region or municipality' };
	}
	if (!isValidTourId(parentTrim)) {
		return { ok: false, error: 'Invalid parent selection' };
	}
	return { ok: true, level, parent_id: parentTrim };
}

function parseJsonNumberField(val: unknown): number | null {
	if (val == null || val === '') return null;
	if (typeof val === 'number' && Number.isFinite(val)) return val;
	if (typeof val === 'string') {
		const t = val.trim();
		if (!t) return null;
		const n = parseFloat(t);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function optionalJsonNumber(j: Record<string, unknown>, key: string): number | null | undefined {
	if (!(key in j)) return undefined;
	return parseJsonNumberField(j[key]);
}

function optionalJsonStringNull(j: Record<string, unknown>, key: string): string | null | undefined {
	if (!(key in j)) return undefined;
	const v = j[key];
	if (v == null) return null;
	const t = String(v).trim();
	return t ? t : null;
}

function buildRegionI18nFromJson(i18nRaw: unknown): Partial<Record<Locale, RegionLocaleBlock>> {
	const i18n: Partial<Record<Locale, RegionLocaleBlock>> = {};
	if (!i18nRaw || typeof i18nRaw !== 'object' || Array.isArray(i18nRaw)) return i18n;
	for (const loc of LOCALES) {
		const rawBlock = (i18nRaw as Record<string, unknown>)[loc];
		if (!rawBlock || typeof rawBlock !== 'object') continue;
		const o = rawBlock as Record<string, unknown>;
		const title = String(o.title ?? '').trim();
		const excerpt = String(o.excerpt ?? '').trim();
		if (!title && !excerpt) continue;
		const sub = o.subtitle;
		i18n[loc] = {
			title,
			subtitle: sub == null || sub === '' ? null : String(sub).trim() || null,
			excerpt,
			seo_title: o.seo_title == null || o.seo_title === '' ? null : String(o.seo_title),
			seo_description:
				o.seo_description == null || o.seo_description === '' ? null : String(o.seo_description),
			body: String(o.body ?? ''),
		};
	}
	return i18n;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const ct = request.headers.get('content-type') ?? '';

	if (isJsonRequestBody(ct)) {
		let j: Record<string, unknown>;
		try {
			j = (await request.json()) as Record<string, unknown>;
		} catch {
			return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const fields = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v == null ? '' : String(v)]));

		if (j.intent === 'delete') {
			const id = String(j.id ?? '').trim();
			if (!id) {
				return new Response(JSON.stringify({ error: 'Missing place id' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const del = deleteRegionPost(id);
			if (!del.ok) {
				return new Response(JSON.stringify({ error: del.error }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const intent = j.intent === 'update' ? 'update' : 'create';
		const slug = String(j.slug ?? '').trim();
		const id = j.id != null ? String(j.id).trim() : '';

		if (intent === 'update' && (!id || !isValidTourId(id))) {
			return new Response(JSON.stringify({ error: 'Missing or invalid place id for update' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!slug || !isValidSlug(slug)) {
			return new Response(JSON.stringify({ error: 'Invalid or missing slug' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const level = parseRegionLevel(String(j.level ?? ''));
		if (!level) {
			return new Response(JSON.stringify({ error: 'Invalid level (region, municipality, or village)' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let parent_id: string | null;
		if (level === 'region') {
			parent_id = null;
		} else {
			const p = j.parent_id;
			if (p == null || p === '') {
				return new Response(JSON.stringify({ error: 'Choose a parent region or municipality' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const ps = String(p).trim();
			if (!isValidTourId(ps)) {
				return new Response(JSON.stringify({ error: 'Invalid parent id' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			parent_id = ps;
		}

		let locationField: TourLocation | null | undefined;
		if (!('location' in j)) {
			locationField = undefined;
		} else if (j.location === null) {
			locationField = null;
		} else {
			const parsed = parseTourLocation(j.location);
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

		let galleryUrls: string[] | undefined;
		if (!('gallery' in j)) galleryUrls = undefined;
		else galleryUrls = normalizeTourGalleryInput(j.gallery);

		const i18n = buildRegionI18nFromJson(j.i18n);

		let imageInput: string | null | undefined;
		if (!('image' in j)) imageInput = undefined;
		else {
			const im = j.image;
			imageInput = im == null || im === '' ? null : String(im).trim() || null;
		}

		const result = saveRegionPost({
			id: intent === 'update' ? id : undefined,
			slug,
			level,
			parent_id,
			image: imageInput,
			gallery: galleryUrls,
			location: locationField,
			population: optionalJsonNumber(j, 'population'),
			area_km2: optionalJsonNumber(j, 'area_km2'),
			elevation_m: optionalJsonNumber(j, 'elevation_m'),
			admin_center_name: optionalJsonStringNull(j, 'admin_center_name'),
			iso_3166_2: optionalJsonStringNull(j, 'iso_3166_2'),
			official_code: optionalJsonStringNull(j, 'official_code'),
			official_website: optionalJsonStringNull(j, 'official_website'),
			wikipedia_url: optionalJsonStringNull(j, 'wikipedia_url'),
			wikidata_id: optionalJsonStringNull(j, 'wikidata_id'),
			geonames_id: optionalJsonStringNull(j, 'geonames_id'),
			settlement_type: optionalJsonStringNull(j, 'settlement_type'),
			i18n,
			mode: intent,
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
				publicUrl: publicContentUrl(request, loc, 'regions', slug),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const respondJson = wantsJsonApiResponse(request, false);

	let fields: Record<string, string> = {};
	let galleryUrls: string[] = [];

	if (ct.includes('multipart/form-data')) {
		const fd = await request.formData();
		fields = Object.fromEntries(
			[...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
		);
		const gu = fd.get('gallery_urls');
		galleryUrls = typeof gu === 'string' ? normalizeTourGalleryInput(gu) : [];
	} else {
		const body = await request.text();
		const params = new URLSearchParams(body);
		fields = Object.fromEntries([...params.entries()]);
		const gu = fields.gallery_urls;
		galleryUrls = gu ? normalizeTourGalleryInput(gu) : [];
	}

	const intent = fields.intent === 'delete' ? 'delete' : fields.intent === 'update' ? 'update' : 'create';

	if (intent === 'delete') {
		const id = fields.id?.trim();
		if (!id) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', 'Missing place id');
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: 'Missing place id' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const del = deleteRegionPost(id);
		if (!del.ok) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', del.error);
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: del.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (respondJson) {
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const back = fields.redirect?.trim() || `/en/admin`;
		return Response.redirect(new URL(back, request.url).toString(), 303);
	}

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

	const lp = parseLevelAndParent(fields);
	if (!lp.ok) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin`;
			const u = new URL(back, request.url);
			u.searchParams.set('error', lp.error);
			return Response.redirect(u.toString(), 303);
		}
		return new Response(JSON.stringify({ error: lp.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

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
	const locationFromForm = locParsed.kind === 'empty' ? null : locParsed.value;

	const i18n = buildI18nFromFields(fields);

	const result = saveRegionPost({
		id: intent === 'update' ? id : undefined,
		slug,
		level: lp.level,
		parent_id: lp.parent_id,
		image: image || null,
		gallery: galleryUrls,
		location: locationFromForm,
		population: parseOptionalNumberField(fields.population ?? ''),
		area_km2: parseOptionalNumberField(fields.area_km2 ?? ''),
		elevation_m: parseOptionalNumberField(fields.elevation_m ?? ''),
		admin_center_name: (fields.admin_center_name ?? '').trim() || null,
		iso_3166_2: (fields.iso_3166_2 ?? '').trim() || null,
		official_code: (fields.official_code ?? '').trim() || null,
		official_website: (fields.official_website ?? '').trim() || null,
		wikipedia_url: (fields.wikipedia_url ?? '').trim() || null,
		wikidata_id: (fields.wikidata_id ?? '').trim() || null,
		geonames_id: (fields.geonames_id ?? '').trim() || null,
		settlement_type: (fields.settlement_type ?? '').trim() || null,
		i18n,
		mode: intent,
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
				publicUrl: publicContentUrl(request, loc, 'regions', slug),
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
