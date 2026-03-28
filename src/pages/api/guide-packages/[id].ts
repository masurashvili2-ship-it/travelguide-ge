/**
 * /api/guide-packages/[id]
 * GET    → package details + slots
 * PUT    → update package
 * DELETE → delete package
 * PATCH  → update availability slots (body: { action, date, ... })
 */
import type { APIRoute } from 'astro';
import {
	getPackageById,
	savePackage,
	deletePackage,
	getSlotsForPackage,
	upsertSlot,
	deleteSlot,
	buildSavePackageInputFromJsonBody,
} from '../../../lib/guide-packages-db';
import { getGuides } from '../../../lib/guides-db';

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
		const input = buildSavePackageInputFromJsonBody(
			{ ...pkg, status: body.status },
			{ guideId: pkg.guide_id, mode: 'update', existingId: pkg.id },
		);
		const result = savePackage(input);
		return new Response(JSON.stringify(result), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const input = buildSavePackageInputFromJsonBody(body, {
		guideId: pkg.guide_id,
		mode: 'update',
		existingId: pkg.id,
	});
	const result = savePackage(input);
	if (!result.ok) {
		return new Response(
			JSON.stringify({
				ok: false,
				error: result.error,
				...(result.errors?.length ? { errors: result.errors } : {}),
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			},
		);
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
