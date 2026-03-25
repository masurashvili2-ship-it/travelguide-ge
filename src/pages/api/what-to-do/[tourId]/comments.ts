import type { APIRoute } from 'astro';
import { userFromRequest } from '../../../../lib/auth';
import {
	addTourComment,
	addTourReply,
	averageRatingFor,
	listCommentsForPost,
	topLevelReviews,
} from '../../../../lib/tour-comments';
import { getWhatToDoPostById, isValidTourId } from '../../../../lib/tours-db';

function isUuid(s: string): boolean {
	return isValidTourId(s);
}

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const tourId = params.tourId ?? '';
	if (!isValidTourId(tourId) || !getWhatToDoPostById(tourId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const comments = await listCommentsForPost('what-to-do', tourId);
	return new Response(
		JSON.stringify({
			comments,
			averageRating: averageRatingFor(comments),
			count: topLevelReviews(comments).length,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

export const POST: APIRoute = async ({ request, params, locals }) => {
	const tourId = params.tourId ?? '';
	if (!isValidTourId(tourId) || !getWhatToDoPostById(tourId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const user = locals.user ?? (await userFromRequest(request.headers.get('cookie')));
	if (!user) {
		return new Response(JSON.stringify({ error: 'You must be logged in to post a review' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let rating = 0;
	let body = '';
	let parentId: string | null = null;
	try {
		const json = (await request.json()) as { rating?: unknown; body?: unknown; parentId?: unknown };
		body = typeof json.body === 'string' ? json.body : '';
		if (typeof json.parentId === 'string' && json.parentId.length > 0) {
			parentId = json.parentId;
		}
		if (parentId) {
			if (!isUuid(parentId)) {
				return new Response(JSON.stringify({ error: 'Invalid parent comment' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const result = await addTourReply('what-to-do', tourId, user, parentId, body);
			if (!result.ok) {
				return new Response(JSON.stringify({ error: result.error }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const comments = await listCommentsForPost('what-to-do', tourId);
			return new Response(
				JSON.stringify({
					ok: true,
					comment: result.comment,
					averageRating: averageRatingFor(comments),
					count: topLevelReviews(comments).length,
				}),
				{ status: 201, headers: { 'Content-Type': 'application/json' } },
			);
		}
		rating = Number(json.rating);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await addTourComment('what-to-do', tourId, user, rating, body);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('what-to-do', tourId);
	return new Response(
		JSON.stringify({
			ok: true,
			comment: result.comment,
			averageRating: averageRatingFor(comments),
			count: topLevelReviews(comments).length,
		}),
		{ status: 201, headers: { 'Content-Type': 'application/json' } },
	);
};
