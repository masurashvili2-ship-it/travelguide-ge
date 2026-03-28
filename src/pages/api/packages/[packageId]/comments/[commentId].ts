import type { APIRoute } from 'astro';
import { userFromRequest } from '../../../../../lib/auth';
import {
	averageRatingFor,
	deleteTourComment,
	listCommentsForPost,
	topLevelReviews,
	updateTourComment,
} from '../../../../../lib/tour-comments';
import { getPackageById } from '../../../../../lib/guide-packages-db';
import { isValidTourId } from '../../../../../lib/tours-db';

export const prerender = false;

function publishedPackage(packageId: string) {
	const pkg = getPackageById(packageId);
	if (!pkg || pkg.status !== 'published') return null;
	return pkg;
}

export const PATCH: APIRoute = async ({ request, params, locals }) => {
	const packageId = params.packageId ?? '';
	const commentId = params.commentId ?? '';
	if (!isValidTourId(packageId) || !isValidTourId(commentId) || !publishedPackage(packageId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const user = locals.user ?? (await userFromRequest(request.headers.get('cookie')));
	if (!user) {
		return new Response(JSON.stringify({ error: 'You must be logged in' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body = '';
	let rating: number | undefined | null = undefined;
	try {
		const json = (await request.json()) as { body?: unknown; rating?: unknown };
		body = typeof json.body === 'string' ? json.body : '';
		if ('rating' in json) {
			if (json.rating === null || json.rating === undefined) {
				rating = undefined;
			} else {
				rating = Number(json.rating);
			}
		}
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await updateTourComment('packages', packageId, commentId, user, body, rating);
	if (!result.ok) {
		const status = result.error === 'Forbidden' ? 403 : result.error === 'Comment not found' ? 404 : 400;
		return new Response(JSON.stringify({ error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('packages', packageId);
	return new Response(
		JSON.stringify({
			ok: true,
			comment: result.comment,
			averageRating: averageRatingFor(comments),
			reviewCount: topLevelReviews(comments).length,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

export const DELETE: APIRoute = async ({ params, locals, request }) => {
	const packageId = params.packageId ?? '';
	const commentId = params.commentId ?? '';
	if (!isValidTourId(packageId) || !isValidTourId(commentId) || !publishedPackage(packageId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const user = locals.user ?? (await userFromRequest(request.headers.get('cookie')));
	if (!user) {
		return new Response(JSON.stringify({ error: 'You must be logged in' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await deleteTourComment('packages', packageId, commentId, user);
	if (!result.ok) {
		const status = result.error === 'Forbidden' ? 403 : result.error === 'Comment not found' ? 404 : 400;
		return new Response(JSON.stringify({ error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('packages', packageId);
	return new Response(
		JSON.stringify({
			ok: true,
			averageRating: averageRatingFor(comments),
			reviewCount: topLevelReviews(comments).length,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
