import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getDataDir } from './data-dir';

/**
 * `tours` = legacy editorial tours (removed); kept for existing JSON rows.
 * `packages` = guide tour packages (`guide-packages.json`).
 */
export type CommentPostKind = 'tours' | 'what-to-do' | 'guides' | 'packages';

/** Top-level review: rating 1–5. Replies: rating null, parentId set. */
export type TourComment = {
	id: string;
	/** Target post id (tour or “what to do”); field name kept for JSON compatibility. */
	tourId: string;
	/** Which store the post lives in; omitted in older rows → treated as `tours`. */
	postKind?: CommentPostKind;
	userId: string;
	userEmail: string;
	rating: number | null;
	body: string;
	parentId: string | null;
	createdAt: number;
	updatedAt?: number;
};

const FILE = path.join(getDataDir(), 'tour-comments.json');

function normalizeComment(raw: Record<string, unknown>): TourComment | null {
	const id = typeof raw.id === 'string' ? raw.id : null;
	const tourId = typeof raw.tourId === 'string' ? raw.tourId : null;
	const userId = typeof raw.userId === 'string' ? raw.userId : null;
	const userEmail = typeof raw.userEmail === 'string' ? raw.userEmail : null;
	const body = typeof raw.body === 'string' ? raw.body : null;
	const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : null;
	if (!id || !tourId || !userId || !userEmail || body == null || createdAt == null) return null;

	const parentId =
		typeof raw.parentId === 'string' && raw.parentId.length > 0 ? raw.parentId : null;

	let rating: number | null;
	if (parentId) {
		rating = null;
	} else if (typeof raw.rating === 'number' && raw.rating >= 1 && raw.rating <= 5) {
		rating = raw.rating;
	} else {
		rating = 5;
	}

	const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined;
	let postKind: CommentPostKind = 'tours';
	if (raw.postKind === 'what-to-do') postKind = 'what-to-do';
	else if (raw.postKind === 'guides') postKind = 'guides';
	else if (raw.postKind === 'packages') postKind = 'packages';

	return {
		id,
		tourId,
		postKind,
		userId,
		userEmail,
		rating,
		body,
		parentId,
		createdAt,
		...(updatedAt !== undefined ? { updatedAt } : {}),
	};
}

export async function readAllTourComments(): Promise<TourComment[]> {
	try {
		const raw = await readFile(FILE, 'utf-8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		const out: TourComment[] = [];
		for (const row of parsed) {
			if (row && typeof row === 'object') {
				const n = normalizeComment(row as Record<string, unknown>);
				if (n) out.push(n);
			}
		}
		return out;
	} catch {
		return [];
	}
}

export async function writeAllTourComments(comments: TourComment[]): Promise<void> {
	await mkdir(path.dirname(FILE), { recursive: true });
	await writeFile(FILE, JSON.stringify(comments, null, 2), 'utf-8');
}

export function topLevelReviews(comments: TourComment[]): TourComment[] {
	return comments.filter((c) => c.parentId == null);
}

export function averageRatingFor(comments: TourComment[]): number | null {
	const top = comments.filter(
		(c) => c.parentId == null && c.rating != null && c.rating >= 1 && c.rating <= 5,
	);
	if (top.length === 0) return null;
	const sum = top.reduce((s, c) => s + (c.rating as number), 0);
	return Math.round((sum / top.length) * 10) / 10;
}

/** Roots newest first; each subtree in chronological order (nested replies supported). */
export function flattenThreaded(comments: TourComment[]): Array<{ c: TourComment; depth: number }> {
	const byParent = new Map<string | null, TourComment[]>();
	for (const c of comments) {
		const p = c.parentId ?? null;
		if (!byParent.has(p)) byParent.set(p, []);
		byParent.get(p)!.push(c);
	}
	for (const arr of byParent.values()) {
		arr.sort((a, b) => a.createdAt - b.createdAt);
	}
	const roots = (byParent.get(null) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
	const out: Array<{ c: TourComment; depth: number }> = [];
	function walkNode(node: TourComment, depth: number) {
		out.push({ c: node, depth });
		const children = byParent.get(node.id) ?? [];
		for (const ch of children) {
			walkNode(ch, depth + 1);
		}
	}
	for (const r of roots) {
		walkNode(r, 0);
	}
	return out;
}

export function commentPostKind(c: TourComment): CommentPostKind {
	return c.postKind ?? 'tours';
}

export async function listCommentsForPost(
	postKind: CommentPostKind,
	postId: string,
): Promise<TourComment[]> {
	const all = await readAllTourComments();
	return all.filter((c) => c.tourId === postId && commentPostKind(c) === postKind);
}

/** Remove all reviews/replies for a tour or “what to do” post (e.g. when the post is deleted). */
export async function deleteAllCommentsForPost(
	postKind: CommentPostKind,
	postId: string,
): Promise<number> {
	const all = await readAllTourComments();
	const filtered = all.filter((c) => !(c.tourId === postId && commentPostKind(c) === postKind));
	const removed = all.length - filtered.length;
	if (removed === 0) return 0;
	await writeAllTourComments(filtered);
	return removed;
}

/** @deprecated use listCommentsForPost('tours', id) */
export async function listCommentsForTour(tourId: string): Promise<TourComment[]> {
	return listCommentsForPost('tours', tourId);
}
