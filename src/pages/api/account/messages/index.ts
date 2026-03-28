import type { APIRoute } from 'astro';
import { readUsers } from '../../../../lib/auth';
import { getBookingById } from '../../../../lib/bookings-db';
import {
	getOrCreateThread,
	listThreadsForUser,
	otherParticipantId,
	resolveBookingForNewThread,
} from '../../../../lib/platform-messages-db';

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const users = await readUsers();
	const threads = listThreadsForUser(locals.user.id);
	const uid = locals.user.id;

	const enriched = threads.map((t) => {
		const otherId = otherParticipantId(t, uid);
		const other = otherId ? users.find((u) => u.id === otherId) : undefined;
		const last = t.messages[t.messages.length - 1];
		const lastRead = t.last_read_up_to[uid] ?? 0;
		const unread = t.messages.filter((m) => m.from_user_id !== uid && m.created_at > lastRead).length;
		const b = t.booking_id ? getBookingById(t.booking_id) : null;
		return {
			id: t.id,
			updated_at: t.updated_at,
			booking_ref: b?.ref ?? null,
			package_title: b?.package_title ?? null,
			other: {
				id: otherId ?? '',
				email: other?.email ?? '',
				label: other?.displayName?.trim() || other?.email || 'User',
			},
			last_preview: last
				? {
						body: last.body.length > 160 ? `${last.body.slice(0, 157)}…` : last.body,
						created_at: last.created_at,
						from_me: last.from_user_id === uid,
					}
				: null,
			unread,
		};
	});

	return new Response(JSON.stringify({ threads: enriched }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ locals, request }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let peer_user_id = '';
	let booking_id: string | null = null;
	try {
		const data = (await request.json()) as Record<string, unknown>;
		peer_user_id = String(data.peer_user_id ?? '').trim();
		const bid = String(data.booking_id ?? '').trim();
		booking_id = bid || null;
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!peer_user_id) {
		return new Response(JSON.stringify({ error: 'peer_user_id is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const users = await readUsers();
	const resolved = resolveBookingForNewThread(users, locals.user.id, peer_user_id, booking_id);
	if (!resolved.ok) {
		return new Response(JSON.stringify({ error: resolved.error }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { thread } = getOrCreateThread(locals.user.id, peer_user_id, resolved.booking.id);
	return new Response(JSON.stringify({ thread_id: thread.id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
