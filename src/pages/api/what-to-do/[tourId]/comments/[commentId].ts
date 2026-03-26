import type { APIRoute } from 'astro';
import { userFromRequest } from '../../../../../lib/auth';
import {
	averageRatingFor,
	deleteTourComment,
	listCommentsForPost,
	topLevelReviews,
	updateTourComment,
} from '../../../../../lib/tour-comments';
import { getWhatToDoPostById, isValidTourId } from '../../../../../lib/tours-db';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params, locals }) => {
	const tourId = params.tourId ?? '';
	const commentId = params.commentId ?? '';
	if (!isValidTourId(tourId) || !isValidTourId(commentId) || !getWhatToDoPostById(tourId)) {
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

	const result = await updateTourComment('what-to-do', tourId, commentId, user, body, rating);
	if (!result.ok) {
		const status = result.error === 'Forbidden' ? 403 : result.error === 'Comment not found' ? 404 : 400;
		return new Response(JSON.stringify({ error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('what-to-do', tourId);
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
	const tourId = params.tourId ?? '';
	const commentId = params.commentId ?? '';
	if (!isValidTourId(tourId) || !isValidTourId(commentId) || !getWhatToDoPostById(tourId)) {
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

	const result = await deleteTourComment('what-to-do', tourId, commentId, user);
	if (!result.ok) {
		const status = result.error === 'Forbidden' ? 403 : result.error === 'Comment not found' ? 404 : 400;
		return new Response(JSON.stringify({ error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('what-to-do', tourId);
	return new Response(
		JSON.stringify({
			ok: true,
			averageRating: averageRatingFor(comments),
			reviewCount: topLevelReviews(comments).length,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
