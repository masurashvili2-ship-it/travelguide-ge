/**
 * /api/guide-packages/[id]
 * GET    → package details + slots
 * PUT    → update package
 * DELETE → delete package
 * PATCH  → update availability slots (body: { action, date, ... })
 */
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import {
	getPackageById,
	savePackage,
	deletePackage,
	getSlotsForPackage,
	upsertSlot,
	deleteSlot,
	type PricingRule,
	type PackageLocaleBlock,
	type SavePackageInput,
} from '../../../lib/guide-packages-db';
import { getGuides } from '../../../lib/guides-db';
import type { Locale } from '../../../lib/strings';

const LOCALES: Locale[] = ['en', 'ka', 'ru'];

function requireUser(locals: App.Locals): Response | null {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Login required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

function getGuideIdForUser(userId: string): string | null {
	const guides = getGuides();
	return guides.find((g) => g.author_user_id === userId)?.id ?? null;
}

function canAccessPackage(locals: App.Locals, packageGuideId: string): boolean {
	if (locals.user?.role === 'admin') return true;
	if (!locals.user) return false;
	const userGuideId = getGuideIdForUser(locals.user.id);
	return userGuideId === packageGuideId;
}

export const GET: APIRoute = async ({ params, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const pkg = getPackageById(params.id ?? '');
	if (!pkg) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!canAccessPackage(locals, pkg.guide_id)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const slots = getSlotsForPackage(pkg.id);
	return new Response(JSON.stringify({ package: pkg, slots }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const pkg = getPackageById(params.id ?? '');
	if (!pkg) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!canAccessPackage(locals, pkg.guide_id)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Admin-only status-only update (approve/reject from admin panel)
	const statusOnlyUpdate =
		locals.user?.role === 'admin' &&
		Object.keys(body).length === 1 &&
		'status' in body &&
		['draft', 'pending_review', 'published'].includes(body.status as string);

	if (statusOnlyUpdate) {
		const merged = { ...pkg, status: body.status as 'draft' | 'pending_review' | 'published' };
		const input = buildSaveInput(
			{
				...merged,
				pricing_rules: pkg.pricing_rules,
				i18n: pkg.i18n,
			},
			pkg.guide_id,
			'update',
			pkg.id,
		);
		const result = savePackage(input);
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const input = buildSaveInput(body, pkg.guide_id, 'update', pkg.id);
	const result = savePackage(input);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const DELETE: APIRoute = async ({ params, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const pkg = getPackageById(params.id ?? '');
	if (!pkg) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!canAccessPackage(locals, pkg.guide_id)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const result = deletePackage(pkg.id);
	return new Response(JSON.stringify(result), {
		headers: { 'Content-Type': 'application/json' },
	});
};

/** PATCH: manage availability slots */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const pkg = getPackageById(params.id ?? '');
	if (!pkg) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!canAccessPackage(locals, pkg.guide_id)) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const action = body.action as string;
	const date = body.date as string;

	if (action === 'upsert') {
		const result = upsertSlot(pkg.id, date, {
			time_start: (body.time_start as string) || null,
			capacity: Number(body.capacity ?? 1),
			status: body.status === 'blocked' ? 'blocked' : 'open',
			custom_price: body.custom_price != null ? Number(body.custom_price) : null,
		});
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (action === 'delete') {
		const result = deleteSlot(pkg.id, date);
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (action === 'bulk') {
		// Bulk set availability for a range of dates
		const dates = body.dates as string[];
		const results: string[] = [];
		if (!Array.isArray(dates)) {
			return new Response(JSON.stringify({ error: 'dates must be array' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		for (const d of dates) {
			const r = upsertSlot(pkg.id, d, {
				time_start: (body.time_start as string) || null,
				capacity: Number(body.capacity ?? 1),
				status: body.status === 'blocked' ? 'blocked' : 'open',
				custom_price: body.custom_price != null ? Number(body.custom_price) : null,
			});
			if (r.ok) results.push(d);
		}
		return new Response(JSON.stringify({ ok: true, updated: results }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ error: 'Unknown action' }), {
		status: 400,
		headers: { 'Content-Type': 'application/json' },
	});
};

function buildSaveInput(
	body: Record<string, unknown>,
	guideId: string,
	mode: 'create' | 'update',
	existingId?: string,
): SavePackageInput {
	const i18n: Partial<Record<Locale, PackageLocaleBlock>> = {};
	for (const loc of LOCALES) {
		const block = (body.i18n as Record<string, unknown> | null)?.[loc] as
			| Record<string, unknown>
			| undefined;
		if (!block?.title) continue;
		i18n[loc] = {
			title: String(block.title ?? '').trim(),
			description: String(block.description ?? ''),
			includes_text: (block.includes_text as string)?.trim() || null,
			excludes_text: (block.excludes_text as string)?.trim() || null,
			meeting_point_text: (block.meeting_point_text as string)?.trim() || null,
			seo_title: (block.seo_title as string)?.trim() || null,
			seo_description: (block.seo_description as string)?.trim() || null,
		};
	}

	const rules = Array.isArray(body.pricing_rules)
		? (body.pricing_rules as unknown[]).map((r: unknown) => {
				const rule = r as Record<string, unknown>;
				return {
					id: String(rule.id ?? randomUUID()),
					kind: (['group', 'early_bird', 'seasonal'].includes(rule.kind as string)
						? rule.kind
						: 'group') as PricingRule['kind'],
					label: (rule.label as string)?.trim() || null,
					discount_pct: Number(rule.discount_pct ?? 0),
					min_pax: rule.min_pax != null ? Number(rule.min_pax) : null,
					max_pax: rule.max_pax != null ? Number(rule.max_pax) : null,
					days_before: rule.days_before != null ? Number(rule.days_before) : null,
					date_from: (rule.date_from as string)?.trim() || null,
					date_to: (rule.date_to as string)?.trim() || null,
				} satisfies PricingRule;
			})
		: [];

	const privateTiersRaw = Array.isArray(body.private_tiers) ? body.private_tiers as unknown[] : [];
	const private_tiers = privateTiersRaw
		.filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
		.map((t) => ({
			id: String(t.id ?? randomUUID()),
			label: String(t.label ?? ''),
			min_pax: Number(t.min_pax ?? 1),
			max_pax: Number(t.max_pax ?? 1),
			price: Number(t.price ?? 0),
		}));

	const transportTypes = ['sedan','suv','minivan','minibus','bus','boat','other'] as const;
	const rawTransport = body.transport_type as string;
	const difficultyVals = ['easy','moderate','challenging'] as const;
	const rawDiff = body.difficulty as string;

	return {
		...(existingId ? { id: existingId } : {}),
		mode,
		guide_id: guideId,
		slug: String(body.slug ?? '').trim(),
		status: body.status === 'published' ? 'published' : body.status === 'pending_review' ? 'pending_review' : 'draft',
		cover_photo: (body.cover_photo as string)?.trim() || null,
		gallery: Array.isArray(body.gallery)
			? (body.gallery as unknown[]).filter((x): x is string => typeof x === 'string')
			: [],
		duration_hours: Number(body.duration_hours ?? 2),
		duration_label: (body.duration_label as string)?.trim() || null,
		min_people: Number(body.min_people ?? 1),
		max_people: Number(body.max_people ?? 10),
		languages: Array.isArray(body.languages)
			? (body.languages as unknown[]).filter((x): x is string => typeof x === 'string')
			: [],
		tour_style: body.tour_style === 'private' ? 'private' : 'group',
		private_tiers,
		base_price: Number(body.base_price ?? 0),
		currency: String(body.currency ?? 'USD'),
		pricing_rules: rules,
		transport_included: body.transport_included === true || body.transport_included === 'true',
		transport_type: transportTypes.includes(rawTransport as typeof transportTypes[number]) ? rawTransport as typeof transportTypes[number] : null,
		transport_notes: (body.transport_notes as string)?.trim() || null,
		pickup_offered: body.pickup_offered === true || body.pickup_offered === 'true',
		pickup_notes: (body.pickup_notes as string)?.trim() || null,
		difficulty: difficultyVals.includes(rawDiff as typeof difficultyVals[number]) ? rawDiff as typeof difficultyVals[number] : null,
		min_age: body.min_age != null && Number(body.min_age) > 0 ? Number(body.min_age) : null,
		cancellation_policy: (body.cancellation_policy as string)?.trim() || null,
		i18n,
	};
}
