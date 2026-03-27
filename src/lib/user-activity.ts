import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CommentPostKind } from './tour-comments-data';
import { getDataDir } from './data-dir';

const FILE = path.join(getDataDir(), 'user-activity.json');
const MAX_TOTAL = 5000;
const BODY_PREVIEW_MAX = 220;

export type UserActivityKind = 'login' | 'review_posted' | 'reply_posted';

export type UserActivityEntry = {
	id: string;
	userId: string;
	at: number;
	kind: UserActivityKind;
	tourId?: string;
	postKind?: CommentPostKind;
	/** Denormalized when the event was recorded */
	postTitle?: string;
	postSlug?: string;
	commentId?: string;
	bodyPreview?: string;
	/** Top-level reviews only */
	rating?: number;
};

function clipBodyPreview(body: string): string {
	const t = body.trim().replace(/\s+/g, ' ');
	if (t.length <= BODY_PREVIEW_MAX) return t;
	return `${t.slice(0, BODY_PREVIEW_MAX - 1)}…`;
}

export type UserActivityAppendMeta = {
	tourId?: string;
	postKind?: CommentPostKind;
	postTitle?: string;
	postSlug?: string;
	commentId?: string;
	/** Full comment body — stored truncated */
	bodyText?: string;
	rating?: number | null;
};

function normalizeEntry(raw: Record<string, unknown>): UserActivityEntry | null {
	const id = typeof raw.id === 'string' ? raw.id : null;
	const userId = typeof raw.userId === 'string' ? raw.userId : null;
	const at = typeof raw.at === 'number' ? raw.at : null;
	const kind = raw.kind;
	if (!id || !userId || at == null) return null;
	if (kind !== 'login' && kind !== 'review_posted' && kind !== 'reply_posted') return null;
	const tourId = typeof raw.tourId === 'string' ? raw.tourId : undefined;
	const postKind: CommentPostKind | undefined =
		raw.postKind === 'what-to-do' ? 'what-to-do' : raw.postKind === 'tours' ? 'tours' : undefined;
	const postTitle = typeof raw.postTitle === 'string' ? raw.postTitle : undefined;
	const postSlug = typeof raw.postSlug === 'string' ? raw.postSlug : undefined;
	const commentId = typeof raw.commentId === 'string' ? raw.commentId : undefined;
	const bodyPreview = typeof raw.bodyPreview === 'string' ? raw.bodyPreview : undefined;
	let rating: number | undefined;
	if (typeof raw.rating === 'number' && raw.rating >= 1 && raw.rating <= 5) {
		rating = raw.rating;
	}
	return {
		id,
		userId,
		at,
		kind,
		...(tourId ? { tourId } : {}),
		...(postKind ? { postKind } : {}),
		...(postTitle ? { postTitle } : {}),
		...(postSlug ? { postSlug } : {}),
		...(commentId ? { commentId } : {}),
		...(bodyPreview ? { bodyPreview } : {}),
		...(rating !== undefined ? { rating } : {}),
	};
}

async function readAll(): Promise<UserActivityEntry[]> {
	try {
		const text = await readFile(FILE, 'utf-8');
		const parsed = JSON.parse(text) as unknown;
		if (!Array.isArray(parsed)) return [];
		const out: UserActivityEntry[] = [];
		for (const row of parsed) {
			if (row && typeof row === 'object') {
				const n = normalizeEntry(row as Record<string, unknown>);
				if (n) out.push(n);
			}
		}
		return out;
	} catch {
		return [];
	}
}

export async function appendUserActivity(
	userId: string,
	kind: UserActivityKind,
	meta?: UserActivityAppendMeta,
): Promise<void> {
	const all = await readAll();
	const bodyPreview =
		meta?.bodyText && meta.bodyText.trim() ? clipBodyPreview(meta.bodyText) : undefined;
	let rating: number | undefined;
	if (kind === 'review_posted' && meta?.rating != null && meta.rating >= 1 && meta.rating <= 5) {
		rating = meta.rating;
	}
	const entry: UserActivityEntry = {
		id: randomUUID(),
		userId,
		at: Date.now(),
		kind,
		...(meta?.tourId ? { tourId: meta.tourId } : {}),
		...(meta?.postKind ? { postKind: meta.postKind } : {}),
		...(meta?.postTitle?.trim() ? { postTitle: meta.postTitle.trim() } : {}),
		...(meta?.postSlug?.trim() ? { postSlug: meta.postSlug.trim() } : {}),
		...(meta?.commentId ? { commentId: meta.commentId } : {}),
		...(bodyPreview ? { bodyPreview } : {}),
		...(rating !== undefined ? { rating } : {}),
	};
	all.unshift(entry);
	if (all.length > MAX_TOTAL) {
		all.length = MAX_TOTAL;
	}
	await mkdir(path.dirname(FILE), { recursive: true });
	await writeFile(FILE, JSON.stringify(all, null, 2), 'utf-8');
}

export async function listActivityForUser(userId: string, limit = 150): Promise<UserActivityEntry[]> {
	const all = await readAll();
	return all.filter((e) => e.userId === userId).slice(0, limit);
}
