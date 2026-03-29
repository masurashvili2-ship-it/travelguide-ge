import type { APIRoute } from 'astro';
import { parseAdminLocale, publicContentUrl, isJsonRequestBody, wantsJsonApiResponse } from '../../../lib/admin-save-response';
import {
	deleteGuideById,
	isValidGuideId,
	normalizeGuideGalleryInput,
	saveGuidePost,
	type GuideLocaleBlock,
} from '../../../lib/guides-db';
import {
	normalizeSocialLinksFromJson,
	parseContactSocialLinksFromFormGlobal,
	trimSocialLinks,
} from '../../../lib/contact-social-links';
import { normalizeGuideSpecialtiesFromRaw } from '../../../lib/guide-specialties';
import type { Locale } from '../../../lib/strings';

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

function buildI18nFromFields(fields: Record<string, string>): Partial<Record<Locale, GuideLocaleBlock>> {
	const i18n: Partial<Record<Locale, GuideLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const name = (fields[`${loc}_name`] ?? '').trim();
		const tagline = (fields[`${loc}_tagline`] ?? '').trim();
		if (!name && !tagline) continue;
		i18n[loc] = {
			name,
			tagline,
			bio: fields[`${loc}_bio`] ?? '',
			seo_title: (fields[`${loc}_seo_title`] ?? '').trim() || null,
			seo_description: (fields[`${loc}_seo_description`] ?? '').trim() || null,
		};
	}
	return i18n;
}

function parseLanguagesSpoken(raw: string): string[] {
	return raw
		.split(/[,;]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function parseYearsExperience(raw: string): number | null {
	const n = parseInt(raw.trim(), 10);
	if (!Number.isFinite(n) || n < 0) return null;
	return n;
}

function parseYearsExperienceJson(raw: unknown): number | null {
	if (raw == null || raw === '') return null;
	if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
	if (typeof raw === 'string') return parseYearsExperience(raw);
	return null;
}

function parseLanguagesFromJsonValue(raw: unknown): string[] {
	if (raw == null) return [];
	if (Array.isArray(raw)) {
		return raw
			.filter((x): x is string => typeof x === 'string')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	if (typeof raw === 'string') return parseLanguagesSpoken(raw);
	return [];
}

function buildGuideI18nFromJson(i18nRaw: unknown): Partial<Record<Locale, GuideLocaleBlock>> {
	const i18n: Partial<Record<Locale, GuideLocaleBlock>> = {};
	if (!i18nRaw || typeof i18nRaw !== 'object' || Array.isArray(i18nRaw)) return i18n;
	for (const loc of LOCALES) {
		const rawBlock = (i18nRaw as Record<string, unknown>)[loc];
		if (!rawBlock || typeof rawBlock !== 'object') continue;
		const o = rawBlock as Record<string, unknown>;
		const name = String(o.name ?? '').trim();
		const tagline = String(o.tagline ?? '').trim();
		if (!name && !tagline) continue;
		i18n[loc] = {
			name,
			tagline,
			bio: String(o.bio ?? ''),
			seo_title: o.seo_title == null || o.seo_title === '' ? null : String(o.seo_title),
			seo_description:
				o.seo_description == null || o.seo_description === '' ? null : String(o.seo_description),
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
			if (!id || !isValidGuideId(id)) {
				return new Response(JSON.stringify({ error: 'Invalid guide id' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const r = deleteGuideById(id);
			if (!r.ok) {
				return new Response(JSON.stringify({ error: r.error }), {
					status: 404,
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

		if (intent === 'update' && (!id || !isValidGuideId(id))) {
			return new Response(JSON.stringify({ error: 'Missing or invalid guide id for update' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 120) {
			return new Response(JSON.stringify({ error: 'Invalid or missing slug' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const i18n = buildGuideI18nFromJson(j.i18n);
		const social_links = trimSocialLinks(normalizeSocialLinksFromJson(j.social_links) ?? {});
		const specialties = normalizeGuideSpecialtiesFromRaw(
			Array.isArray(j.specialties) ? j.specialties : [],
		);
		const languages_spoken = parseLanguagesFromJsonValue(j.languages_spoken);
		const years_experience = parseYearsExperienceJson(j.years_experience);
		const baseRaw = j.base_location;
		const base_location =
			baseRaw == null || baseRaw === '' ? null : String(baseRaw).trim() || null;
		const priceRaw = j.price_from;
		const price_from = priceRaw == null || priceRaw === '' ? null : String(priceRaw).trim() || null;
		const verified = j.verified === true;
		const profRaw = j.profile_photo;
		const profile_photo =
			profRaw == null || profRaw === '' ? null : String(profRaw).trim() || null;
		const galleryUrls = normalizeGuideGalleryInput(j.gallery);
		const placeIdsRaw = j.place_ids;
		const place_ids = Array.isArray(placeIdsRaw)
			? placeIdsRaw.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
			: [];

		let author_user_id: string | null | undefined;
		let author_email: string | null | undefined;
		if ('author_user_id' in j) {
			const v = j.author_user_id;
			author_user_id =
				v == null || v === '' ? null : typeof v === 'string' ? v.trim() || null : String(v).trim() || null;
		}
		if ('author_email' in j) {
			const v = j.author_email;
			author_email =
				v == null || v === '' ? null : typeof v === 'string' ? v.trim() || null : String(v).trim() || null;
		}

		const result = saveGuidePost({
			id: intent === 'update' ? id : undefined,
			mode: intent,
			slug,
			profile_photo,
			gallery: galleryUrls,
			social_links,
			languages_spoken,
			years_experience,
			base_location,
			place_ids,
			price_from,
			verified,
			specialties,
			i18n,
			...(author_user_id !== undefined ? { author_user_id } : {}),
			...(author_email !== undefined ? { author_email } : {}),
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
				publicUrl: publicContentUrl(request, loc, 'guides', slug),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const jsonBody = false;
	const respondJson = wantsJsonApiResponse(request, jsonBody);

	let fields: Record<string, string> = {};
	let galleryUrls: string[] = [];
	let specialtiesFromForm: string[] = [];

	const fd = await request.formData();
	fields = Object.fromEntries(
		[...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
	);
	const gu = fd.get('gallery_urls');
	galleryUrls = typeof gu === 'string' ? normalizeGuideGalleryInput(gu) : [];
	specialtiesFromForm = fd.getAll('specialties').map((v) => (typeof v === 'string' ? v : ''));

	if (fields.intent === 'bulk_delete') {
		const ids = fd.getAll('ids').map((v) => (typeof v === 'string' ? v : ''));
		let deleted = 0;
		for (const id of ids) {
			if (!isValidGuideId(id)) continue;
			const r = deleteGuideById(id);
			if (r.ok) deleted++;
		}
		const back = fields.redirect?.trim() || `/en/admin/guides`;
		return Response.redirect(new URL(back, request.url).toString(), 303);
	}

	if (fields.intent === 'delete') {
		const id = (fields.id ?? '').trim();
		if (!id || !isValidGuideId(id)) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin/guides`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', 'Invalid guide id');
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: 'Invalid guide id' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const r = deleteGuideById(id);
		if (!r.ok) {
			if (!respondJson) {
				const back = fields.redirect?.trim() || `/en/admin/guides`;
				const u = new URL(back, request.url);
				u.searchParams.set('error', r.error);
				return Response.redirect(u.toString(), 303);
			}
			return new Response(JSON.stringify({ error: r.error }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const back = fields.redirect?.trim() || `/en/admin/guides`;
		return Response.redirect(new URL(back, request.url).toString(), 303);
	}

	const intent = fields.intent === 'update' ? 'update' : 'create';
	const slug = (fields.slug ?? '').trim();
	const id = (fields.id ?? '').trim();

	if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 120) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin/guides`;
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
	const social_links = parseContactSocialLinksFromFormGlobal(fields);
	const specialties = normalizeGuideSpecialtiesFromRaw(specialtiesFromForm);
	const languages_spoken = parseLanguagesSpoken(fields.languages_spoken ?? '');
	const years_experience = parseYearsExperience(fields.years_experience ?? '');
	const base_location = (fields.base_location ?? '').trim() || null;
	const price_from = (fields.price_from ?? '').trim() || null;
	const verified = fields.verified === '1' || fields.verified === 'true';
	const profile_photo = (fields.profile_photo ?? '').trim() || null;

	const result = saveGuidePost({
		id: intent === 'update' ? id : undefined,
		mode: intent,
		slug,
		profile_photo,
		gallery: galleryUrls,
		social_links,
		languages_spoken,
		years_experience,
		base_location,
		place_ids: [],
		price_from,
		verified,
		specialties,
		i18n,
	});

	if (!result.ok) {
		if (!respondJson) {
			const back = fields.redirect?.trim() || `/en/admin/guides`;
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
				publicUrl: publicContentUrl(request, loc, 'guides', slug),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const back = fields.redirect?.trim() || `/en/admin/guides`;
	return Response.redirect(new URL(back, request.url).toString(), 303);
};
