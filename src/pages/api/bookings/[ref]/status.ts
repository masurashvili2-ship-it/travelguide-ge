/**
 * /api/bookings/[ref]/status — Guide/admin updates booking status
 * PATCH → confirm, complete, cancel
 */
import type { APIRoute } from 'astro';
import { getBookingByRef, updateBookingStatus, type BookingStatus } from '../../../../lib/bookings-db';
import { getGuides } from '../../../../lib/guides-db';
import { decrementSlotBooked } from '../../../../lib/guide-packages-db';
import { sendMail } from '../../../../lib/mailer';

function requireUser(locals: App.Locals): Response | null {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Login required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

function getGuideIdForUser(userId: string): string | null {
	return getGuides().find((g) => g.author_user_id === userId)?.id ?? null;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const denied = requireUser(locals);
	if (denied) return denied;

	const booking = getBookingByRef(params.ref ?? '');
	if (!booking) {
		return new Response(JSON.stringify({ error: 'Booking not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const isAdmin = locals.user!.role === 'admin';
	const userGuideId = isAdmin ? null : getGuideIdForUser(locals.user!.id);
	if (!isAdmin && userGuideId !== booking.guide_id) {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return new Response(JSON.stringify({ error: 'Invalid body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const newStatus = body.status as BookingStatus;
	if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
		return new Response(JSON.stringify({ error: 'Invalid status' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = updateBookingStatus(booking.id, newStatus, {
		reason: body.reason as string | undefined,
		notes: body.notes as string | undefined,
	});

	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Release capacity if cancelled
	if (newStatus === 'cancelled' && booking.slot_id) {
		decrementSlotBooked(booking.slot_id, booking.pax);
	}

	// Send notification email to customer
	let emailSubject = '';
	let emailHtml = '';
	if (newStatus === 'confirmed') {
		emailSubject = `Booking Confirmed — ${booking.ref}`;
		emailHtml = `<h2>Your booking is confirmed!</h2><p>Hi <strong>${booking.customer_name}</strong>,</p><p>Your guide has confirmed your booking.</p><table style="border-collapse:collapse"><tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Reference</td><td style="padding:6px 12px">${booking.ref}</td></tr><tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Tour</td><td style="padding:6px 12px">${booking.package_title}</td></tr><tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Date</td><td style="padding:6px 12px">${booking.date}${booking.time_start ? ' at ' + booking.time_start : ''}</td></tr><tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">People</td><td style="padding:6px 12px">${booking.pax}</td></tr><tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Total</td><td style="padding:6px 12px">${booking.total_price} ${booking.currency}</td></tr></table>`;
	} else if (newStatus === 'cancelled') {
		emailSubject = `Booking Cancelled — ${booking.ref}`;
		const reason = body.reason as string | undefined;
		emailHtml = `<h2>Booking Cancelled</h2><p>Hi <strong>${booking.customer_name}</strong>,</p><p>Unfortunately your booking <strong>${booking.ref}</strong> for <strong>${booking.package_title}</strong> on ${booking.date} has been cancelled.${reason ? ` Reason: ${reason}` : ''}</p><p>Please contact us if you have any questions.</p>`;
	}

	if (emailSubject && emailHtml) {
		sendMail({ to: booking.customer_email, subject: emailSubject, html: emailHtml }).catch(() => {});
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
