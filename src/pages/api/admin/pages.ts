import type { APIRoute } from 'astro';
import type { Locale } from '../../../lib/strings';
import {
	parseAdminLocale,
	publicContentUrl,
	wantsJsonApiResponse,
} from '../../../lib/admin-save-response';
import { savePagePost, type PageLocaleBlock } from '../../../lib/pages-db';

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

function buildI18nFromFields(fields: Record<string, string>): Partial<Record<Locale, PageLocaleBlock>> {
	const i18n: Partial<Record<Locale, PageLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const title = (fields[`${loc}_title`] ?? '').trim();
		const body = fields[`${loc}_body`] ?? '';
		const st = (fields[`${loc}_seo_title`] ?? '').trim();
		const sd = (fields[`${loc}_seo_description`] ?? '').trim();
		if (!title && !body.trim() && !st && !sd) continue;
		i18n[loc] = {
			title,
			body,
			seo_title: st || null,
			seo_description: sd || null,
		};
	}
	return i18n;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const respondJson = wantsJsonApiResponse(request, false);

	const fd = await request.formData();
	const fields = Object.fromEntries(
		[...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
	);

	const intent = fields.intent === 'update' ? 'update' : 'create';
	const slug = fields.slug?.trim() ?? '';
	const id = fields.id?.trim();
	const redirect = fields.redirect?.trim() || `/en/admin/pages`;

	const sortRaw = fields.sort_order?.trim();
	const sort_order = sortRaw === '' || sortRaw === undefined ? 0 : Number.parseInt(sortRaw, 10);

	const i18n = buildI18nFromFields(fields);

	const result = savePagePost({
		id: intent === 'update' ? id : undefined,
		slug,
		sort_order: Number.isFinite(sort_order) ? sort_order : 0,
		i18n,
		mode: intent === 'update' ? 'update' : 'create',
	});

	if (!result.ok) {
		if (!respondJson) {
			const u = new URL(redirect, request.url);
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
				publicUrl: publicContentUrl(request, loc, 'page', slug.trim().toLowerCase()),
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	return Response.redirect(new URL(redirect, request.url).toString(), 303);
};
