import type { APIRoute } from 'astro';
import type { Locale } from '../../../lib/strings';
import { parseAdminLocale, publicContentUrl, wantsJsonApiResponse } from '../../../lib/admin-save-response';
import {
	isValidSlug,
	isValidTourId,
	normalizeTourGalleryInput,
	parseTourLocationFromForm,
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

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const ct = request.headers.get('content-type') ?? '';
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
