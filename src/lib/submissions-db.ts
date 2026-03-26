import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ContactSocialLinks } from './contact-social-links';
import { trimSocialLinks } from './contact-social-links';
import type { Locale } from './strings';
import type { PageLocaleBlock } from './pages-db';
import { pagePostToContributionPayload, tourPostToContributionPayload } from './contribute-live-payload';
import {
	deletePagePostById,
	getPagePostBySlug,
	getPagePostById,
	isPageSlugUsedByAnotherPage,
	savePagePost,
	validatePagePostI18nAndSlug,
} from './pages-db';
import {
	deleteContentPostById,
	findContentPostBySlug,
	getContentPostById,
	isTourSlugUsedByAnotherPost,
	saveTourPost,
	saveWhatToDoPost,
	validateTourPostI18nAndSlug,
	type ContentPostKind,
	type SaveTourPostInput,
	type TourLocation,
	type TourLocaleBlock,
} from './tours-db';
import type { TourCategoryId } from './tour-categories';
import type { WhatToDoCategoryId } from './what-to-do-categories';
import type { WhatToDoSeasonId } from './what-to-do-seasons';
import type { TourPhysicalRatingId } from './tour-physical-rating';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'content-submissions.json');

export type SubmissionKind = 'tours' | 'what-to-do' | 'page';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

/** Serializable tour / what-to-do payload (create-only semantics). */
export type TourLikeSubmissionPayload = {
	slug: string;
	image: string | null;
	gallery: string[];
	location: TourLocation | null;
	category: TourCategoryId | null;
	whatDoCategories: WhatToDoCategoryId[];
	whatDoSeasons: WhatToDoSeasonId[];
	physical_rating: TourPhysicalRatingId | null;
	driving_distance: string | null;
	/** What-to-do only; tours use null */
	google_directions_url: string | null;
	/** Shared social/contact URLs (what-to-do); tours use {} */
	social_links: ContactSocialLinks;
	i18n: Partial<Record<Locale, TourLocaleBlock>>;
};

export type PageSubmissionPayload = {
	slug: string;
	sort_order: number;
	i18n: Partial<Record<Locale, PageLocaleBlock>>;
};

export type ContentSubmission = {
	id: string;
	kind: SubmissionKind;
	status: SubmissionStatus;
	author_user_id: string;
	author_email: string;
	created_at: number;
	updated_at: number;
	reject_reason: string | null;
	reviewed_at: number | null;
	reviewed_by_email: string | null;
	/** Live post id after approval */
	published_id: string | null;
	payload: TourLikeSubmissionPayload | PageSubmissionPayload;
};

type StoreFile = { submissions: ContentSubmission[] };

let cached: ContentSubmission[] | null = null;
let cachedMtime = 0;

function ensureDataDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function fileMtime(): number {
	if (!existsSync(STORE_FILE)) return 0;
	try {
		return statSync(STORE_FILE).mtimeMs;
	} catch {
		return 0;
	}
}

function readAll(): ContentSubmission[] {
	ensureDataDir();
	if (!existsSync(STORE_FILE)) {
		writeFileSync(STORE_FILE, `${JSON.stringify({ submissions: [] }, null, 2)}\n`, 'utf8');
		return [];
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreFile;
		if (!Array.isArray(raw.submissions)) return [];
		return raw.submissions.filter((s): s is ContentSubmission => typeof s?.id === 'string');
	} catch {
		return [];
	}
}

export function getSubmissions(): ContentSubmission[] {
	const m = fileMtime();
	if (cached === null || m > cachedMtime) {
		cached = readAll();
		cachedMtime = m;
	}
	return cached;
}

function writeAll(list: ContentSubmission[]) {
	ensureDataDir();
	writeFileSync(STORE_FILE, `${JSON.stringify({ submissions: list }, null, 2)}\n`, 'utf8');
	cached = [...list];
	cachedMtime = fileMtime();
}

function slugForPayload(kind: SubmissionKind, payload: TourLikeSubmissionPayload | PageSubmissionPayload): string {
	if (kind === 'page') {
		return (payload as PageSubmissionPayload).slug.trim().toLowerCase();
	}
	return (payload as TourLikeSubmissionPayload).slug.trim();
}

/**
 * Pending submission blocks the same slug (and live content).
 * `excludeSubmissionId` skips that row (for updates).
 * `exceptPublishedPostId` ignores that live post when checking the store (author editing their own row).
 */
export function isSlugBlockedForSubmission(
	kind: SubmissionKind,
	slug: string,
	excludeSubmissionId?: string,
	exceptPublishedPostId?: string | null,
): boolean {
	const normalizedPageSlug = kind === 'page' ? slug.trim().toLowerCase() : slug;
	if (kind === 'tours' || kind === 'what-to-do') {
		if (isTourSlugUsedByAnotherPost(kind as ContentPostKind, slug, exceptPublishedPostId ?? null)) return true;
	}
	if (kind === 'page') {
		if (isPageSlugUsedByAnotherPage(normalizedPageSlug, exceptPublishedPostId ?? null)) return true;
	}
	for (const s of getSubmissions()) {
		if (excludeSubmissionId && s.id === excludeSubmissionId) continue;
		if (s.status !== 'pending') continue;
		if (s.kind !== kind) continue;
		const pSlug = slugForPayload(s.kind, s.payload);
		if (kind === 'page') {
			if (pSlug === normalizedPageSlug) return true;
		} else if (pSlug === slug) {
			return true;
		}
	}
	return false;
}

export function listPendingSubmissions(): ContentSubmission[] {
	return getSubmissions()
		.filter((s) => s.status === 'pending')
		.sort((a, b) => b.created_at - a.created_at);
}

export function countPendingSubmissions(): number {
	return listPendingSubmissions().length;
}

export function listSubmissionsForUser(userId: string): ContentSubmission[] {
	return getSubmissions()
		.filter((s) => s.author_user_id === userId)
		.sort((a, b) => b.updated_at - a.updated_at);
}

export function getSubmissionById(id: string): ContentSubmission | null {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	return getSubmissions().find((s) => s.id === id) ?? null;
}

/**
 * When a live post has no `author_email` (older approvals, etc.), resolve it from the submission
 * still linked by `published_id` (approved or pending re-review).
 */
export function contributorAuthorEmailForPublishedPost(
	kind: SubmissionKind,
	publishedId: string,
): string | null {
	const pid = publishedId.trim();
	if (!pid) return null;
	for (const s of getSubmissions()) {
		if (s.kind !== kind || s.published_id !== pid) continue;
		if (s.status !== 'approved' && s.status !== 'pending') continue;
		const e = s.author_email?.trim();
		if (e) return e;
	}
	return null;
}

function validateTourLikePayload(
	kind: SubmissionKind,
	p: TourLikeSubmissionPayload,
	excludeSubmissionId?: string,
	exceptPublishedPostId?: string | null,
): { ok: true } | { ok: false; error: string } {
	const input: SaveTourPostInput = {
		slug: p.slug,
		image: p.image,
		gallery: p.gallery,
		location: p.location,
		category: kind === 'tours' ? p.category : null,
		whatDoCategories: kind === 'what-to-do' ? p.whatDoCategories : [],
		whatDoSeasons: kind === 'what-to-do' ? p.whatDoSeasons : [],
		physical_rating: p.physical_rating,
		driving_distance: p.driving_distance,
		google_directions_url:
			kind === 'what-to-do' ? (p.google_directions_url ?? null) : undefined,
		social_links: trimSocialLinks(p.social_links ?? {}),
		i18n: p.i18n,
		mode: 'create',
	};
	const v = validateTourPostI18nAndSlug(input.slug, input.i18n);
	if (!v.ok) return v;
	if (isSlugBlockedForSubmission(kind, p.slug, excludeSubmissionId, exceptPublishedPostId)) {
		return { ok: false, error: 'This slug is already used or has a pending submission' };
	}
	return { ok: true };
}

function validatePagePayload(
	p: PageSubmissionPayload,
	excludeSubmissionId?: string,
	exceptPublishedPostId?: string | null,
): { ok: true } | { ok: false; error: string } {
	const v = validatePagePostI18nAndSlug(p.slug, p.i18n);
	if (!v.ok) return v;
	if (isSlugBlockedForSubmission('page', v.slug, excludeSubmissionId, exceptPublishedPostId)) {
		return { ok: false, error: 'This slug is already used or has a pending submission' };
	}
	return { ok: true };
}

function unpublishLivePost(s: ContentSubmission): { ok: true } | { ok: false; error: string } {
	if (!s.published_id) return { ok: true };
	if (s.kind === 'tours') return deleteContentPostById('tours', s.published_id);
	if (s.kind === 'what-to-do') return deleteContentPostById('what-to-do', s.published_id);
	return deletePagePostById(s.published_id);
}

function restorePayloadFromLive(
	s: ContentSubmission,
):
	| { ok: true; payload: TourLikeSubmissionPayload | PageSubmissionPayload }
	| { ok: false; error: string } {
	if (!s.published_id) return { ok: false, error: 'Missing published reference' };
	if (s.kind === 'tours') {
		const post = getContentPostById('tours', s.published_id);
		if (!post) {
			return {
				ok: false,
				error: 'Live tour is no longer on the site. Contact an admin or delete this row.',
			};
		}
		return { ok: true, payload: tourPostToContributionPayload(post, 'tours') };
	}
	if (s.kind === 'what-to-do') {
		const post = getContentPostById('what-to-do', s.published_id);
		if (!post) {
			return {
				ok: false,
				error: 'Live item is no longer on the site. Contact an admin or delete this row.',
			};
		}
		return { ok: true, payload: tourPostToContributionPayload(post, 'what-to-do') };
	}
	const page = getPagePostById(s.published_id);
	if (!page) {
		return {
			ok: false,
			error: 'Live page is no longer on the site. Contact an admin or delete this row.',
		};
	}
	return { ok: true, payload: pagePostToContributionPayload(page) };
}

export function addContentSubmission(
	kind: SubmissionKind,
	payload: TourLikeSubmissionPayload | PageSubmissionPayload,
	author: { userId: string; email: string },
): { ok: true; id: string } | { ok: false; error: string } {
	let check: { ok: true } | { ok: false; error: string };
	if (kind === 'page') {
		check = validatePagePayload(payload as PageSubmissionPayload);
	} else {
		check = validateTourLikePayload(kind, payload as TourLikeSubmissionPayload);
	}
	if (!check.ok) return check;

	const now = Date.now();
	const row: ContentSubmission = {
		id: randomUUID(),
		kind,
		status: 'pending',
		author_user_id: author.userId,
		author_email: author.email,
		created_at: now,
		updated_at: now,
		reject_reason: null,
		reviewed_at: null,
		reviewed_by_email: null,
		published_id: null,
		payload: JSON.parse(JSON.stringify(payload)) as typeof payload,
	};

	const list = [...getSubmissions(), row];
	writeAll(list);
	return { ok: true, id: row.id };
}

export function withdrawSubmission(
	submissionId: string,
	userId: string,
): { ok: true } | { ok: false; error: string } {
	const list = [...getSubmissions()];
	const idx = list.findIndex((s) => s.id === submissionId);
	if (idx === -1) return { ok: false, error: 'Submission not found' };
	const s = list[idx];
	if (s.author_user_id !== userId) return { ok: false, error: 'Not your submission' };
	const now = Date.now();

	if (s.status === 'pending' && s.published_id) {
		const restored = restorePayloadFromLive(s);
		if (!restored.ok) return restored;
		list[idx] = {
			...s,
			status: 'approved',
			payload: restored.payload,
			updated_at: now,
			reject_reason: null,
		};
		writeAll(list);
		return { ok: true };
	}

	if (s.status === 'pending' && !s.published_id) {
		list[idx] = {
			...s,
			status: 'withdrawn',
			updated_at: now,
			reject_reason: null,
		};
		writeAll(list);
		return { ok: true };
	}

	if (s.status === 'approved') {
		const u = unpublishLivePost(s);
		if (!u.ok && u.error !== 'Post not found' && u.error !== 'Page not found') return u;
		list[idx] = {
			...s,
			status: 'withdrawn',
			published_id: null,
			updated_at: now,
			reject_reason: null,
		};
		writeAll(list);
		return { ok: true };
	}

	return { ok: false, error: 'Only pending or approved submissions can be withdrawn' };
}

const EDITABLE_STATUSES: SubmissionStatus[] = ['pending', 'rejected', 'withdrawn', 'approved'];

export function updatePendingSubmission(
	submissionId: string,
	userId: string,
	nextPayload: TourLikeSubmissionPayload | PageSubmissionPayload,
): { ok: true } | { ok: false; error: string } {
	const list = [...getSubmissions()];
	const idx = list.findIndex((s) => s.id === submissionId);
	if (idx === -1) return { ok: false, error: 'Submission not found' };
	const s = list[idx];
	if (s.author_user_id !== userId) return { ok: false, error: 'Not your submission' };
	if (!EDITABLE_STATUSES.includes(s.status)) {
		return { ok: false, error: 'This submission cannot be edited' };
	}

	const exceptPost = s.status === 'approved' && s.published_id ? s.published_id : null;

	let check: { ok: true } | { ok: false; error: string };
	if (s.kind === 'page') {
		check = validatePagePayload(nextPayload as PageSubmissionPayload, submissionId, exceptPost);
	} else {
		check = validateTourLikePayload(s.kind, nextPayload as TourLikeSubmissionPayload, submissionId, exceptPost);
	}
	if (!check.ok) return check;

	const now = Date.now();
	list[idx] = {
		...s,
		payload: JSON.parse(JSON.stringify(nextPayload)) as typeof nextPayload,
		updated_at: now,
		status: 'pending',
		reject_reason: null,
		reviewed_at: null,
		reviewed_by_email: null,
	};
	writeAll(list);
	return { ok: true };
}

/** Removes the submission row; if it was live, removes the public post too. */
export function deleteSubmissionPermanently(
	submissionId: string,
	userId: string,
): { ok: true } | { ok: false; error: string } {
	const list = getSubmissions();
	const idx = list.findIndex((s) => s.id === submissionId);
	if (idx === -1) return { ok: false, error: 'Submission not found' };
	const s = list[idx];
	if (s.author_user_id !== userId) return { ok: false, error: 'Not your submission' };
	if (s.published_id) {
		const u = unpublishLivePost(s);
		if (!u.ok && u.error !== 'Post not found' && u.error !== 'Page not found') return u;
	}
	const next = list.filter((x) => x.id !== submissionId);
	writeAll(next);
	return { ok: true };
}

export function approveSubmission(
	submissionId: string,
	reviewerEmail: string,
): { ok: true; publishedId: string } | { ok: false; error: string } {
	const list = [...getSubmissions()];
	const idx = list.findIndex((s) => s.id === submissionId);
	if (idx === -1) return { ok: false, error: 'Submission not found' };
	const s = list[idx];
	if (s.status !== 'pending') return { ok: false, error: 'Submission is not pending' };

	const author = {
		author_user_id: s.author_user_id,
		author_email: s.author_email,
	};
	const now = Date.now();

	if (s.kind === 'tours') {
		const p = s.payload as TourLikeSubmissionPayload;
		const existingId = s.published_id;
		const existing = existingId ? getContentPostById('tours', existingId) : null;

		if (existing) {
			if (isTourSlugUsedByAnotherPost('tours', p.slug, existing.id)) {
				return { ok: false, error: 'Slug conflict — resolve duplicates before approving' };
			}
			if (isSlugBlockedExceptSelf(s.id, 'tours', p.slug)) {
				return { ok: false, error: 'Another pending submission uses this slug' };
			}
			const result = saveTourPost({
				id: existing.id,
				mode: 'update',
				slug: p.slug,
				image: p.image,
				gallery: p.gallery,
				location: p.location,
				category: p.category,
				physical_rating: p.physical_rating,
				driving_distance: p.driving_distance,
				social_links: trimSocialLinks(p.social_links ?? {}),
				i18n: p.i18n,
				author_user_id: author.author_user_id,
				author_email: author.author_email,
			});
			if (!result.ok) return { ok: false, error: result.error };
			list[idx] = {
				...s,
				status: 'approved',
				updated_at: now,
				reviewed_at: now,
				reviewed_by_email: reviewerEmail,
				reject_reason: null,
				published_id: existing.id,
			};
			writeAll(list);
			return { ok: true, publishedId: existing.id };
		}

		if (isTourSlugUsedByAnotherPost('tours', p.slug, null) || isSlugBlockedExceptSelf(s.id, 'tours', p.slug)) {
			return { ok: false, error: 'Slug conflict — resolve duplicates before approving' };
		}
		const result = saveTourPost({
			slug: p.slug,
			image: p.image,
			gallery: p.gallery,
			location: p.location,
			category: p.category,
			physical_rating: p.physical_rating,
			driving_distance: p.driving_distance,
			social_links: trimSocialLinks(p.social_links ?? {}),
			i18n: p.i18n,
			mode: 'create',
			author_user_id: author.author_user_id,
			author_email: author.author_email,
		});
		if (!result.ok) return { ok: false, error: result.error };
		const created = findContentPostBySlug('tours', p.slug);
		if (!created) return { ok: false, error: 'Save succeeded but post not found' };
		list[idx] = {
			...s,
			status: 'approved',
			updated_at: now,
			reviewed_at: now,
			reviewed_by_email: reviewerEmail,
			reject_reason: null,
			published_id: created.id,
		};
		writeAll(list);
		return { ok: true, publishedId: created.id };
	}

	if (s.kind === 'what-to-do') {
		const p = s.payload as TourLikeSubmissionPayload;
		const existingId = s.published_id;
		const existing = existingId ? getContentPostById('what-to-do', existingId) : null;

		if (existing) {
			if (isTourSlugUsedByAnotherPost('what-to-do', p.slug, existing.id)) {
				return { ok: false, error: 'Slug conflict — resolve duplicates before approving' };
			}
			if (isSlugBlockedExceptSelf(s.id, 'what-to-do', p.slug)) {
				return { ok: false, error: 'Another pending submission uses this slug' };
			}
			const result = saveWhatToDoPost({
				id: existing.id,
				mode: 'update',
				slug: p.slug,
				image: p.image,
				gallery: p.gallery,
				location: p.location,
				whatDoCategories: p.whatDoCategories,
				whatDoSeasons: p.whatDoSeasons,
				physical_rating: p.physical_rating,
				driving_distance: p.driving_distance,
				google_directions_url: p.google_directions_url ?? null,
				social_links: trimSocialLinks(p.social_links ?? {}),
				i18n: p.i18n,
				author_user_id: author.author_user_id,
				author_email: author.author_email,
			});
			if (!result.ok) return { ok: false, error: result.error };
			list[idx] = {
				...s,
				status: 'approved',
				updated_at: now,
				reviewed_at: now,
				reviewed_by_email: reviewerEmail,
				reject_reason: null,
				published_id: existing.id,
			};
			writeAll(list);
			return { ok: true, publishedId: existing.id };
		}

		if (
			isTourSlugUsedByAnotherPost('what-to-do', p.slug, null) ||
			isSlugBlockedExceptSelf(s.id, 'what-to-do', p.slug)
		) {
			return { ok: false, error: 'Slug conflict — resolve duplicates before approving' };
		}
		const result = saveWhatToDoPost({
			slug: p.slug,
			image: p.image,
			gallery: p.gallery,
			location: p.location,
			whatDoCategories: p.whatDoCategories,
			whatDoSeasons: p.whatDoSeasons,
			physical_rating: p.physical_rating,
			driving_distance: p.driving_distance,
			google_directions_url: p.google_directions_url ?? null,
			social_links: trimSocialLinks(p.social_links ?? {}),
			i18n: p.i18n,
			mode: 'create',
			author_user_id: author.author_user_id,
			author_email: author.author_email,
		});
		if (!result.ok) return { ok: false, error: result.error };
		const created = findContentPostBySlug('what-to-do', p.slug);
		if (!created) return { ok: false, error: 'Save succeeded but post not found' };
		list[idx] = {
			...s,
			status: 'approved',
			updated_at: now,
			reviewed_at: now,
			reviewed_by_email: reviewerEmail,
			reject_reason: null,
			published_id: created.id,
		};
		writeAll(list);
		return { ok: true, publishedId: created.id };
	}

	const p = s.payload as PageSubmissionPayload;
	const slugLower = p.slug.trim().toLowerCase();
	const existingPageId = s.published_id;
	const existingPage = existingPageId ? getPagePostById(existingPageId) : null;

	if (existingPage) {
		if (isPageSlugUsedByAnotherPage(slugLower, existingPage.id)) {
			return { ok: false, error: 'A page with this slug already exists' };
		}
		if (isSlugBlockedExceptSelf(s.id, 'page', slugLower)) {
			return { ok: false, error: 'Another pending submission uses this slug' };
		}
		const result = savePagePost({
			id: existingPage.id,
			slug: p.slug,
			sort_order: p.sort_order,
			i18n: p.i18n,
			mode: 'update',
			author_user_id: author.author_user_id,
			author_email: author.author_email,
		});
		if (!result.ok) return { ok: false, error: result.error };
		list[idx] = {
			...s,
			status: 'approved',
			updated_at: now,
			reviewed_at: now,
			reviewed_by_email: reviewerEmail,
			reject_reason: null,
			published_id: existingPage.id,
		};
		writeAll(list);
		return { ok: true, publishedId: existingPage.id };
	}

	if (isPageSlugUsedByAnotherPage(slugLower, null)) {
		return { ok: false, error: 'A page with this slug already exists' };
	}
	if (isSlugBlockedExceptSelf(s.id, 'page', slugLower)) {
		return { ok: false, error: 'Another pending submission uses this slug' };
	}
	const result = savePagePost({
		slug: p.slug,
		sort_order: p.sort_order,
		i18n: p.i18n,
		mode: 'create',
		author_user_id: author.author_user_id,
		author_email: author.author_email,
	});
	if (!result.ok) return { ok: false, error: result.error };
	const created = getPagePostBySlug(slugLower);
	if (!created) return { ok: false, error: 'Save succeeded but page not found' };
	list[idx] = {
		...s,
		status: 'approved',
		updated_at: now,
		reviewed_at: now,
		reviewed_by_email: reviewerEmail,
		reject_reason: null,
		published_id: created.id,
	};
	writeAll(list);
	return { ok: true, publishedId: created.id };
}

function isSlugBlockedExceptSelf(selfId: string, kind: SubmissionKind, slug: string): boolean {
	const norm = kind === 'page' ? slug.trim().toLowerCase() : slug;
	for (const s of getSubmissions()) {
		if (s.id === selfId || s.status !== 'pending') continue;
		if (s.kind !== kind) continue;
		const pSlug = slugForPayload(s.kind, s.payload);
		if (kind === 'page') {
			if (pSlug === norm) return true;
		} else if (pSlug === slug) {
			return true;
		}
	}
	return false;
}

export function rejectSubmission(
	submissionId: string,
	reviewerEmail: string,
	reason: string,
): { ok: true } | { ok: false; error: string } {
	const list = [...getSubmissions()];
	const idx = list.findIndex((s) => s.id === submissionId);
	if (idx === -1) return { ok: false, error: 'Submission not found' };
	const s = list[idx];
	if (s.status !== 'pending') return { ok: false, error: 'Submission is not pending' };
	const now = Date.now();
	list[idx] = {
		...s,
		status: 'rejected',
		updated_at: now,
		reviewed_at: now,
		reviewed_by_email: reviewerEmail,
		reject_reason: reason.trim() || 'No reason given',
	};
	writeAll(list);
	return { ok: true };
}
