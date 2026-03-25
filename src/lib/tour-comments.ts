import { randomUUID } from 'node:crypto';
import type { UserPublic } from './auth';
import { type ContentPostKind, getContentPostById } from './tours-db';
import {
	type CommentPostKind,
	type TourComment,
	commentPostKind,
	readAllTourComments,
	writeAllTourComments,
} from './tour-comments-data';

export type { CommentPostKind, TourComment } from './tour-comments-data';
export {
	averageRatingFor,
	flattenThreaded,
	topLevelReviews,
	listCommentsForPost,
	listCommentsForTour,
} from './tour-comments-data';

export async function addTourComment(
	postKind: ContentPostKind,
	tourId: string,
	user: UserPublic,
	rating: number,
	body: string,
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
	const post = getContentPostById(postKind, tourId);
	if (!post) {
		return { ok: false, error: 'Post not found' };
	}
	const r = Math.round(rating);
	if (!Number.isFinite(r) || r < 1 || r > 5) {
		return { ok: false, error: 'Rating must be between 1 and 5' };
	}
	const trimmed = body.trim();
	if (trimmed.length < 1) {
		return { ok: false, error: 'Comment cannot be empty' };
	}
	if (trimmed.length > 4000) {
		return { ok: false, error: 'Comment is too long' };
	}

	const comment: TourComment = {
		id: randomUUID(),
		tourId,
		postKind: postKind as CommentPostKind,
		userId: user.id,
		userEmail: user.email,
		rating: r,
		body: trimmed,
		parentId: null,
		createdAt: Date.now(),
	};

	const all = await readAllTourComments();
	all.push(comment);
	await writeAllTourComments(all);
	return { ok: true, comment };
}

export async function addTourReply(
	postKind: ContentPostKind,
	tourId: string,
	user: UserPublic,
	parentId: string,
	body: string,
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
	const post = getContentPostById(postKind, tourId);
	if (!post) {
		return { ok: false, error: 'Post not found' };
	}
	const trimmed = body.trim();
	if (trimmed.length < 1) {
		return { ok: false, error: 'Reply cannot be empty' };
	}
	if (trimmed.length > 4000) {
		return { ok: false, error: 'Reply is too long' };
	}

	const all = await readAllTourComments();
	const parent = all.find(
		(c) => c.id === parentId && c.tourId === tourId && commentPostKind(c) === postKind,
	);
	if (!parent) {
		return { ok: false, error: 'Parent comment not found' };
	}

	const comment: TourComment = {
		id: randomUUID(),
		tourId,
		postKind: postKind as CommentPostKind,
		userId: user.id,
		userEmail: user.email,
		rating: null,
		body: trimmed,
		parentId,
		createdAt: Date.now(),
	};

	all.push(comment);
	await writeAllTourComments(all);
	return { ok: true, comment };
}

export async function updateTourComment(
	postKind: ContentPostKind,
	tourId: string,
	commentId: string,
	actor: UserPublic,
	body: string,
	ratingUpdate?: number | null,
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
	const trimmed = body.trim();
	if (trimmed.length < 1) {
		return { ok: false, error: 'Comment cannot be empty' };
	}
	if (trimmed.length > 4000) {
		return { ok: false, error: 'Comment is too long' };
	}

	const all = await readAllTourComments();
	const idx = all.findIndex(
		(c) => c.id === commentId && c.tourId === tourId && commentPostKind(c) === postKind,
	);
	if (idx === -1) {
		return { ok: false, error: 'Comment not found' };
	}
	const c = all[idx];
	const isAuthor = c.userId === actor.id;
	const isAdmin = actor.role === 'admin';
	if (!isAuthor && !isAdmin) {
		return { ok: false, error: 'Forbidden' };
	}

	let newRating = c.rating;
	const isTopLevelReview = c.parentId == null && c.rating != null;
	if (isTopLevelReview && ratingUpdate !== undefined && ratingUpdate !== null) {
		const r = Math.round(ratingUpdate);
		if (!Number.isFinite(r) || r < 1 || r > 5) {
			return { ok: false, error: 'Rating must be between 1 and 5' };
		}
		newRating = r;
	}

	all[idx] = {
		...c,
		body: trimmed,
		rating: newRating,
		updatedAt: Date.now(),
	};
	await writeAllTourComments(all);
	return { ok: true, comment: all[idx] };
}
