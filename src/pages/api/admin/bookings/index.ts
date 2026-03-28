/**
 * /api/admin/bookings — Admin booking management
 * GET  → list all bookings
 * DELETE → bulk delete bookings
 */
import type { APIRoute } from 'astro';
import { listAllBookingsAdmin, deleteBooking } from '../../../../lib/bookings-db';

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

export const GET: APIRoute = async ({ locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;
	return new Response(JSON.stringify({ bookings: listAllBookingsAdmin() }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const DELETE: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const ids = Array.isArray(body?.ids) ? (body!.ids as string[]) : [];
	const results = ids.map((id) => deleteBooking(id));
	const failed = results.filter((r) => !r.ok).length;
	return new Response(JSON.stringify({ ok: true, deleted: ids.length - failed, failed }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
