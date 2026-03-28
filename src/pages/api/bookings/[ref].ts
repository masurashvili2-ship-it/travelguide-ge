/**
 * /api/bookings/[ref] — Public booking status lookup
 * GET → returns booking details for a ref code
 */
import type { APIRoute } from 'astro';
import { getBookingByRef } from '../../../lib/bookings-db';

export const GET: APIRoute = async ({ params }) => {
	const booking = getBookingByRef(params.ref ?? '');
	if (!booking) {
		return new Response(JSON.stringify({ error: 'Booking not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	// Return safe subset only
	const safe = {
		ref: booking.ref,
		package_title: booking.package_title,
		date: booking.date,
		time_start: booking.time_start,
		pax: booking.pax,
		total_price: booking.total_price,
		currency: booking.currency,
		discount_pct: booking.discount_pct,
		discount_label: booking.discount_label,
		status: booking.status,
		customer_name: booking.customer_name,
		special_requests: booking.special_requests,
		created_at: booking.created_at,
		confirmed_at: booking.confirmed_at,
		cancelled_at: booking.cancelled_at,
		cancellation_reason: booking.cancellation_reason,
	};
	return new Response(JSON.stringify({ booking: safe }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
