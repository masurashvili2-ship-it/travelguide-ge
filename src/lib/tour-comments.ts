import { randomUUID } from 'node:crypto';
import type { UserPublic } from './auth';
import { getContentPostById, urlSegmentForContentKind } from './tours-db';
import { getGuideById } from './guides-db';
import { getPackageById } from './guide-packages-db';
import {
	type CommentPostKind,
	type TourComment,
	commentPostKind,
	readAllTourComments,
	topLevelReviews,
	writeAllTourComments,
} from './tour-comments-data';

function postExistsForComments(postKind: CommentPostKind, postId: string): boolean {
	if (postKind === 'guides') return getGuideById(postId) != null;
	if (postKind === 'packages') return getPackageById(postId) != null;
	if (postKind === 'tours') return false;
	return getContentPostById('what-to-do', postId) != null;
}

export type { CommentPostKind, TourComment } from './tour-comments-data';
export {
	averageRatingFor,
	deleteAllCommentsForPost,
	flattenThreaded,
	topLevelReviews,
	listCommentsForPost,
	listCommentsForTour,
} from './tour-comments-data';

export async function addTourComment(
	postKind: CommentPostKind,
	tourId: string,
	user: UserPublic,
	rating: number,
	body: string,
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
	if (!postExistsForComments(postKind, tourId)) {
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

	const allBefore = await readAllTourComments();
	const alreadyReviewed = allBefore.some(
		(c) =>
			c.tourId === tourId &&
			commentPostKind(c) === postKind &&
			c.parentId == null &&
			c.userId === user.id,
	);
	if (alreadyReviewed) {
		return { ok: false, error: 'You already posted a review for this page.' };
	}

	const comment: TourComment = {
		id: randomUUID(),
		tourId,
		postKind,
		userId: user.id,
		userEmail: user.email,
		rating: r,
		body: trimmed,
		parentId: null,
		createdAt: Date.now(),
	};

	const all = [...allBefore, comment];
	await writeAllTourComments(all);
	return { ok: true, comment };
}

export async function addTourReply(
	postKind: CommentPostKind,
	tourId: string,
	user: UserPublic,
	parentId: string,
	body: string,
): Promise<{ ok: true; comment: TourComment } | { ok: false; error: string }> {
	if (!postExistsForComments(postKind, tourId)) {
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

	const myReplies = all.filter(
		(c) =>
			c.tourId === tourId &&
			commentPostKind(c) === postKind &&
			c.parentId != null &&
			c.userId === user.id,
	);
	const lastReplyAt = myReplies.reduce<number | null>(
		(best, c) => (best == null || c.createdAt > best ? c.createdAt : best),
		null,
	);
	if (lastReplyAt != null && Date.now() - lastReplyAt < 60_000) {
		return { ok: false, error: 'Please wait a minute before posting another reply.' };
	}

	const comment: TourComment = {
		id: randomUUID(),
		tourId,
		postKind,
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
	postKind: CommentPostKind,
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

function descendantIdsForRemoval(
	all: TourComment[],
	postKind: CommentPostKind,
	tourId: string,
	rootId: string,
): Set<string> {
	const ids = new Set<string>([rootId]);
	const queue = [rootId];
	while (queue.length > 0) {
		const pid = queue.shift()!;
		for (const c of all) {
			if (c.tourId !== tourId || commentPostKind(c) !== postKind) continue;
			if (c.parentId === pid && !ids.has(c.id)) {
				ids.add(c.id);
				queue.push(c.id);
			}
		}
	}
	return ids;
}

export async function deleteTourComment(
	postKind: CommentPostKind,
	tourId: string,
	commentId: string,
	actor: UserPublic,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
	const remove = descendantIdsForRemoval(all, postKind, tourId, commentId);
	const next = all.filter((row) => !remove.has(row.id));
	await writeAllTourComments(next);
	return { ok: true };
}

export type RecentCommentForAdmin = TourComment & {
	postTitle: string;
	postSlug: string;
	urlSegment: string;
};

export async function listRecentCommentsForAdmin(limit = 100): Promise<RecentCommentForAdmin[]> {
	const all = await readAllTourComments();
	const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
	return sorted.map((c) => {
		const kind = commentPostKind(c);
		if (kind === 'guides') {
			const guide = getGuideById(c.tourId);
			const name =
				guide?.i18n?.en?.name?.trim() ||
				guide?.i18n?.ka?.name?.trim() ||
				guide?.i18n?.ru?.name?.trim() ||
				'(unnamed guide)';
			return {
				...c,
				postTitle: name,
				postSlug: guide?.slug ?? c.tourId,
				urlSegment: 'guides',
			};
		}
		if (kind === 'packages') {
			const pkg = getPackageById(c.tourId);
			const block = pkg?.i18n?.en ?? pkg?.i18n?.ka ?? pkg?.i18n?.ru;
			const title = block?.title?.trim() || '(package)';
			return {
				...c,
				postTitle: title,
				postSlug: pkg?.slug ?? c.tourId,
				urlSegment: 'tours',
			};
		}
		if (kind === 'tours') {
			return {
				...c,
				postTitle: '(removed tour)',
				postSlug: c.tourId,
				urlSegment: 'tours',
			};
		}
		const post = getContentPostById('what-to-do', c.tourId);
		const block = post?.i18n.en ?? post?.i18n.ka ?? post?.i18n.ru;
		const title = block?.title?.trim() || '(untitled)';
		const slug = post?.slug ?? c.tourId;
		return {
			...c,
			postTitle: title,
			postSlug: slug,
			urlSegment: urlSegmentForContentKind('what-to-do'),
		};
	});
}

/** Same notion of “already reviewed” as the API: a root-level comment by this account. */
export function userHasRootReviewForAccount(
	comments: TourComment[],
	user: { id: string; email: string },
): boolean {
	const roots = topLevelReviews(comments);
	const id = user.id.trim();
	const emailNorm = user.email.trim().toLowerCase();
	return roots.some(
		(c) =>
			String(c.userId).trim() === id ||
			c.userEmail.trim().toLowerCase() === emailNorm,
	);
}
