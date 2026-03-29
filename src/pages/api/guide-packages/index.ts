/**
 * /api/guide-packages — Guide manages their own packages (requires auth).
 * GET  → list packages for the logged-in guide
 * POST → create a new package
 */
import type { APIRoute } from 'astro';
import {
	getPackages,
	savePackage,
	listPackagesForGuide,
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
	const guide = guides.find((g) => g.author_user_id === userId);
	return guide?.id ?? null;
}

export const GET: APIRoute = async ({ locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const guideId =
		locals.user!.role === 'admin'
			? null
			: getGuideIdForUser(locals.user!.id);

	const packages = guideId
		? listPackagesForGuide(guideId)
		: locals.user!.role === 'admin'
			? getPackages()
			: [];

	return new Response(JSON.stringify({ packages }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const resolvedGuideId =
		locals.user!.role === 'admin'
			? (typeof body.guide_id === 'string' ? body.guide_id : '')
			: (getGuideIdForUser(locals.user!.id) ?? '');

	if (!resolvedGuideId) {
		return new Response(JSON.stringify({ error: 'No guide profile linked to your account. Create a guide profile first.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const input = buildSavePackageInputFromJsonBody(body, {
		guideId: resolvedGuideId,
		mode: 'create',
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
	return new Response(JSON.stringify({ ok: true, id: result.id }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
