import type { APIRoute } from 'astro';
import {
	addContentSubmission,
	updatePendingSubmission,
	getSubmissionById,
	type GuideSubmissionPayload,
} from '../../../lib/submissions-db';
import { parseContactSocialLinksFromFormGlobal } from '../../../lib/contact-social-links';
import { normalizeGuideSpecialtiesFromRaw } from '../../../lib/guide-specialties';
import { normalizeGuideGalleryInput } from '../../../lib/guides-db';
import { notifyAdmin } from '../../../lib/mailer';
import type { Locale } from '../../../lib/strings';
import type { GuideLocaleBlock } from '../../../lib/guides-db';

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> | null {
	return locals.user ?? null;
}

function buildI18nFromForm(fields: Record<string, string>): Partial<Record<Locale, GuideLocaleBlock>> {
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

export const POST: APIRoute = async ({ request, locals, url }) => {
	const user = requireUser(locals);
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const editId = url.searchParams.get('edit')?.trim() || null;

	const fd = await request.formData();
	const fields = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
	const gu = fd.get('gallery_urls');
	const galleryUrls = typeof gu === 'string' ? normalizeGuideGalleryInput(gu) : [];
	const specialtiesRaw = fd.getAll('specialties').map((v) => (typeof v === 'string' ? v : ''));

	const slug = fields.slug?.trim();
	if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 120) {
		return new Response(JSON.stringify({ error: 'Invalid or missing slug' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const i18n = buildI18nFromForm(fields);
	const social_links = parseContactSocialLinksFromFormGlobal(fields);
	const specialties = normalizeGuideSpecialtiesFromRaw(specialtiesRaw);
	const languages_spoken = (fields.languages_spoken ?? '')
		.split(/[,;]+/)
		.map((s) => s.trim())
		.filter(Boolean);
	const years_raw = fields.years_experience?.trim();
	const years_experience = years_raw ? (parseInt(years_raw, 10) || null) : null;
	const base_location = fields.base_location?.trim() || null;
	const price_from = fields.price_from?.trim() || null;
	const profile_photo = fields.profile_photo?.trim() || null;

	const payload: GuideSubmissionPayload = {
		slug,
		profile_photo,
		gallery: galleryUrls,
		social_links,
		languages_spoken,
		years_experience,
		base_location,
		place_ids: [],
		price_from,
		specialties,
		i18n,
	};

	if (editId) {
		const sub = getSubmissionById(editId);
		if (!sub || sub.kind !== 'guides' || sub.author_user_id !== user.id) {
			return new Response(JSON.stringify({ error: 'Submission not found or access denied' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const updated = updatePendingSubmission(editId, user.id, payload);
		if (!updated.ok) {
			return new Response(JSON.stringify({ error: updated.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ ok: true, submissionId: editId }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const added = addContentSubmission('guides', payload, { userId: user.id, email: user.email });
	if (!added.ok) {
		return new Response(JSON.stringify({ error: added.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	notifyAdmin(
		'[TravelGuide] New guide submission',
		`<p>A new <strong>tour guide</strong> submission has arrived from <strong>${user.email}</strong>.</p>
<p>Submission ID: <code>${added.id}</code></p>
<p>Review it in the <a href="/en/admin/submissions">admin panel</a>.</p>`,
	);

	return new Response(JSON.stringify({ ok: true, submissionId: added.id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
