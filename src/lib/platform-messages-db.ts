import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';
import { getBookingById, listAllBookingsAdmin, listBookingsForCustomerEmail, listBookingsForGuide, type Booking } from './bookings-db';
import { getGuideById, getGuides } from './guides-db';
import type { StoredUser } from './auth';
import type { Locale } from './strings';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'platform-messages.json');

export type PlatformMessage = {
	id: string;
	from_user_id: string;
	body: string;
	created_at: number;
};

export type PlatformThread = {
	id: string;
	/** Two distinct user ids, sorted lexicographically */
	participant_ids: [string, string];
	/** Optional link to the booking that allowed this conversation */
	booking_id: string | null;
	updated_at: number;
	/** Per-user: last message `created_at` they have seen (inclusive) */
	last_read_up_to: Record<string, number>;
	messages: PlatformMessage[];
};

type StoreFile = { threads: PlatformThread[] };

let _cache: StoreFile | null = null;

function ensureDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(): StoreFile {
	if (_cache) return _cache;
	if (!existsSync(STORE_FILE)) {
		_cache = { threads: [] };
		return _cache;
	}
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreFile;
		if (!raw || !Array.isArray(raw.threads)) _cache = { threads: [] };
		else
			_cache = {
				threads: raw.threads
					.map(normalizeThread)
					.filter((t) => t.participant_ids[0] && t.participant_ids[1]),
			};
	} catch {
		_cache = { threads: [] };
	}
	return _cache;
}

function writeStore(s: StoreFile) {
	ensureDir();
	writeFileSync(STORE_FILE, JSON.stringify(s, null, 2) + '\n', 'utf8');
	_cache = { threads: s.threads.map((t) => ({ ...t, messages: [...t.messages] })) };
}

function normalizeThread(t: PlatformThread): PlatformThread {
	const ids = [...new Set((t.participant_ids || []).filter(Boolean))].sort() as [string, string];
	const lr = typeof t.last_read_up_to === 'object' && t.last_read_up_to ? { ...t.last_read_up_to } : {};
	const msgs = Array.isArray(t.messages)
		? t.messages
				.filter((m) => m && typeof m.from_user_id === 'string')
				.map((m) => ({
					id: String(m.id || ''),
					from_user_id: String(m.from_user_id),
					body: String(m.body ?? ''),
					created_at: typeof m.created_at === 'number' ? m.created_at : 0,
				}))
				.sort((a, b) => a.created_at - b.created_at)
		: [];
	return {
		id: String(t.id || ''),
		participant_ids: ids.length === 2 ? [ids[0], ids[1]] : ['', ''],
		booking_id: t.booking_id?.trim() || null,
		updated_at: typeof t.updated_at === 'number' ? t.updated_at : 0,
		last_read_up_to: lr,
		messages: msgs,
	};
}

export function invalidatePlatformMessagesCache() {
	_cache = null;
}

function sortPair(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a];
}

/** Resolve registered user id for a booking customer, if their email matches an account. */
export function customerUserIdForBooking(booking: Booking, users: StoredUser[]): string | null {
	const em = booking.customer_email.trim().toLowerCase();
	const u = users.find((x) => x.email === em);
	return u?.id ?? null;
}

export function guideOwnerUserIdForBooking(booking: Booking): string | null {
	const g = getGuideById(booking.guide_id);
	return g?.author_user_id?.trim() || null;
}

/** True if both users are the guide owner and the registered customer for this booking. */
export function bookingLinksUsers(booking: Booking, users: StoredUser[], a: string, b: string): boolean {
	const gu = guideOwnerUserIdForBooking(booking);
	const cu = customerUserIdForBooking(booking, users);
	if (!gu || !cu) return false;
	const pair = sortPair(a, b);
	return pair[0] === sortPair(gu, cu)[0] && pair[1] === sortPair(gu, cu)[1];
}

export function findSharedBookingForPair(
	users: StoredUser[],
	userId: string,
	peerId: string,
): Booking | null {
	const matches = listAllBookingsAdmin().filter((b) => bookingLinksUsers(b, users, userId, peerId));
	if (!matches.length) return null;
	matches.sort((a, b) => b.created_at - a.created_at);
	return matches[0] ?? null;
}

export function canUsersMessage(
	users: StoredUser[],
	userId: string,
	peerId: string,
): { ok: true; booking: Booking } | { ok: false } {
	if (!userId || !peerId || userId === peerId) return { ok: false };
	const b = findSharedBookingForPair(users, userId, peerId);
	if (!b) return { ok: false };
	return { ok: true, booking: b };
}

export function otherParticipantId(thread: PlatformThread, viewerUserId: string): string | undefined {
	const [a, b] = thread.participant_ids;
	if (a === viewerUserId) return b;
	if (b === viewerUserId) return a;
	return undefined;
}

export function listThreadsForUser(userId: string): PlatformThread[] {
	const { threads } = readStore();
	return threads
		.filter((t) => t.participant_ids[0] === userId || t.participant_ids[1] === userId)
		.slice()
		.sort((a, b) => b.updated_at - a.updated_at);
}

export function getThreadForUser(threadId: string, userId: string): PlatformThread | null {
	const { threads } = readStore();
	const t = threads.find((x) => x.id === threadId);
	if (!t) return null;
	if (t.participant_ids[0] !== userId && t.participant_ids[1] !== userId) return null;
	return t;
}

function unreadInThreadForUser(t: PlatformThread, userId: string): number {
	const last = t.last_read_up_to[userId] ?? 0;
	return t.messages.filter((m) => m.from_user_id !== userId && m.created_at > last).length;
}

export function countUnreadPlatformMessages(userId: string): number {
	return listThreadsForUser(userId).reduce((n, t) => n + unreadInThreadForUser(t, userId), 0);
}

export function findThreadByParticipants(
	pair: [string, string],
	bookingId: string | null,
): PlatformThread | null {
	const [p0, p1] = sortPair(pair[0], pair[1]);
	const { threads } = readStore();
	return (
		threads.find(
			(t) =>
				t.participant_ids[0] === p0 &&
				t.participant_ids[1] === p1 &&
				(t.booking_id || null) === (bookingId || null),
		) ?? null
	);
}

export function getOrCreateThread(
	userId: string,
	peerId: string,
	bookingId: string | null,
): { thread: PlatformThread; created: boolean } {
	const pair = sortPair(userId, peerId);
	const store = readStore();
	const existing = findThreadByParticipants(pair, bookingId);
	if (existing) return { thread: existing, created: false };

	const thread: PlatformThread = {
		id: randomBytes(12).toString('hex'),
		participant_ids: pair,
		booking_id: bookingId,
		updated_at: Date.now(),
		last_read_up_to: { [userId]: Date.now(), [peerId]: 0 },
		messages: [],
	};
	store.threads.push(thread);
	writeStore(store);
	return { thread, created: true };
}

export function markThreadRead(threadId: string, userId: string): boolean {
	const store = readStore();
	const t = store.threads.find((x) => x.id === threadId);
	if (!t || (t.participant_ids[0] !== userId && t.participant_ids[1] !== userId)) return false;
	const maxT = t.messages.reduce((m, x) => Math.max(m, x.created_at), 0);
	t.last_read_up_to[userId] = Math.max(t.last_read_up_to[userId] ?? 0, maxT, Date.now());
	writeStore(store);
	return true;
}

export function appendPlatformMessage(
	threadId: string,
	fromUserId: string,
	body: string,
): { ok: true; message: PlatformMessage } | { ok: false; error: string } {
	const text = body.trim();
	if (!text) return { ok: false, error: 'Message is empty' };
	if (text.length > 8000) return { ok: false, error: 'Message is too long' };

	const store = readStore();
	const t = store.threads.find((x) => x.id === threadId);
	if (!t) return { ok: false, error: 'Thread not found' };
	if (t.participant_ids[0] !== fromUserId && t.participant_ids[1] !== fromUserId) {
		return { ok: false, error: 'Forbidden' };
	}

	const message: PlatformMessage = {
		id: randomBytes(8).toString('hex'),
		from_user_id: fromUserId,
		body: text,
		created_at: Date.now(),
	};
	t.messages.push(message);
	t.updated_at = message.created_at;
	/* Sender has seen their own message */
	t.last_read_up_to[fromUserId] = Math.max(t.last_read_up_to[fromUserId] ?? 0, message.created_at);
	writeStore(store);
	return { ok: true, message };
}

/** Ensure booking id matches an existing thread or is consistent for new threads */
export function resolveBookingForNewThread(
	users: StoredUser[],
	userId: string,
	peerId: string,
	bookingId: string | null,
): { ok: true; booking: Booking } | { ok: false; error: string } {
	const auth = canUsersMessage(users, userId, peerId);
	if (!auth.ok) return { ok: false, error: 'You can only message someone you have a booking with' };

	if (bookingId) {
		const b = getBookingById(bookingId);
		if (!b || !bookingLinksUsers(b, users, userId, peerId)) {
			return { ok: false, error: 'Invalid booking for this conversation' };
		}
		return { ok: true, booking: b };
	}
	return { ok: true, booking: auth.booking };
}

export type MessagingPeerOption = {
	peer_user_id: string;
	peer_email: string;
	peer_label: string;
	booking_id: string;
	booking_ref: string;
	package_title: string;
};

/** People the user may message (shared booking + other party has an account). */
export function listMessagingPeers(
	users: StoredUser[],
	userId: string,
	userEmail: string,
): MessagingPeerOption[] {
	const guides = getGuides().filter((g) => g.author_user_id === userId);
	const asGuideBookings = guides.flatMap((g) => listBookingsForGuide(g.id));
	const asCustomer = listBookingsForCustomerEmail(userEmail);

	const out: MessagingPeerOption[] = [];
	const seen = new Set<string>();

	for (const b of asGuideBookings) {
		const cu = customerUserIdForBooking(b, users);
		if (!cu) continue;
		const key = `${cu}:${b.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const peer = users.find((u) => u.id === cu);
		out.push({
			peer_user_id: cu,
			peer_email: peer?.email ?? b.customer_email,
			peer_label: peer?.displayName?.trim() || peer?.email || b.customer_name,
			booking_id: b.id,
			booking_ref: b.ref,
			package_title: b.package_title,
		});
	}

	const nameLocales: Locale[] = ['en', 'ka', 'ru'];
	for (const b of asCustomer) {
		const gu = guideOwnerUserIdForBooking(b);
		if (!gu) continue;
		const key = `${gu}:${b.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const peer = users.find((u) => u.id === gu);
		const g = getGuideById(b.guide_id);
		let nameBlock: string | undefined;
		for (const loc of nameLocales) {
			const n = g?.i18n?.[loc]?.name?.trim();
			if (n) {
				nameBlock = n;
				break;
			}
		}
		out.push({
			peer_user_id: gu,
			peer_email: peer?.email ?? '',
			peer_label: peer?.displayName?.trim() || nameBlock || peer?.email || 'Guide',
			booking_id: b.id,
			booking_ref: b.ref,
			package_title: b.package_title,
		});
	}

	return out;
}
