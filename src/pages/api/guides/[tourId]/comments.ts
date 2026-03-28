import type { APIRoute } from 'astro';
import { userFromRequest } from '../../../../lib/auth';
import {
	addTourComment,
	addTourReply,
	averageRatingFor,
	listCommentsForPost,
	topLevelReviews,
} from '../../../../lib/tour-comments';
import { getGuideById, isValidGuideId } from '../../../../lib/guides-db';
import { appendUserActivity } from '../../../../lib/user-activity';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const guideId = params.tourId ?? '';
	if (!isValidGuideId(guideId) || !getGuideById(guideId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const comments = await listCommentsForPost('guides', guideId);
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
	const guideId = params.tourId ?? '';
	if (!isValidGuideId(guideId)) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const guide = getGuideById(guideId);
	if (!guide) {
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
			if (!isValidGuideId(parentId)) {
				return new Response(JSON.stringify({ error: 'Invalid parent comment' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const result = await addTourReply('guides', guideId, user, parentId, body);
			if (!result.ok) {
				return new Response(JSON.stringify({ error: result.error }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const comments = await listCommentsForPost('guides', guideId);
			void appendUserActivity(user.id, 'reply_posted', {
				tourId: guideId,
				postKind: 'guides' as never,
				postTitle: guide.i18n?.en?.name ?? guide.i18n?.ka?.name ?? '',
				postSlug: guide.slug,
				commentId: result.comment.id,
				bodyText: result.comment.body,
			});
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

	const result = await addTourComment('guides', guideId, user, rating, body);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const comments = await listCommentsForPost('guides', guideId);
	void appendUserActivity(user.id, 'review_posted', {
		tourId: guideId,
		postKind: 'guides' as never,
		postTitle: guide.i18n?.en?.name ?? guide.i18n?.ka?.name ?? '',
		postSlug: guide.slug,
		commentId: result.comment.id,
		bodyText: result.comment.body,
		rating: result.comment.rating,
	});
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
