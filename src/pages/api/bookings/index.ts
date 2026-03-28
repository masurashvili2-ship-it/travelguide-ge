/**
 * POST /api/bookings — Create a new booking (public)
 */
import type { APIRoute } from 'astro';
import {
	getPackageById,
	getSlotsForPackage,
	incrementSlotBooked,
	calculatePrice,
	getSlotByPackageAndDate,
} from '../../../lib/guide-packages-db';
import { createBooking } from '../../../lib/bookings-db';
import { sendMail, notifyAdmin } from '../../../lib/mailer';
import type { Locale } from '../../../lib/strings';

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) {
		return new Response(JSON.stringify({ error: 'Invalid request body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const packageId = String(body.package_id ?? '').trim();
	const date = String(body.date ?? '').trim();
	const pax = parseInt(String(body.pax ?? '1'), 10);
	const tierId = String(body.tier_id ?? '').trim() || null;
	const customerName = String(body.customer_name ?? '').trim();
	const customerEmail = String(body.customer_email ?? '').trim();
	const customerPhone = String(body.customer_phone ?? '').trim() || null;
	const specialRequests = String(body.special_requests ?? '').trim() || null;

	if (!packageId || !date || !customerName || !customerEmail) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
		return new Response(JSON.stringify({ error: 'Invalid email address' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
		return new Response(JSON.stringify({ error: 'Invalid date format' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const today = new Date().toISOString().slice(0, 10);
	if (date < today) {
		return new Response(JSON.stringify({ error: 'Cannot book a past date' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const pkg = getPackageById(packageId);
	if (!pkg || pkg.status !== 'published') {
		return new Response(JSON.stringify({ error: 'Package not available' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Validate pax & tier
	if (pkg.tour_style === 'private') {
		const enabledTiers = pkg.private_tiers.filter((t) => t.price > 0);
		if (!tierId) {
			return new Response(JSON.stringify({ error: 'Please select a group size tier' }), {
				status: 400, headers: { 'Content-Type': 'application/json' },
			});
		}
		const tier = enabledTiers.find((t) => t.id === tierId);
		if (!tier) {
			return new Response(JSON.stringify({ error: 'Selected tier is not available' }), {
				status: 400, headers: { 'Content-Type': 'application/json' },
			});
		}
		if (isNaN(pax) || pax < tier.min_pax || pax > tier.max_pax) {
			return new Response(
				JSON.stringify({ error: `Group size must be between ${tier.min_pax} and ${tier.max_pax} for this tier` }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } },
			);
		}
	} else if (isNaN(pax) || pax < pkg.min_people || pax > pkg.max_people) {
		return new Response(
			JSON.stringify({
				error: `Number of people must be between ${pkg.min_people} and ${pkg.max_people}`,
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	// Check slot availability
	const slot = getSlotByPackageAndDate(packageId, date);
	if (!slot) {
		return new Response(JSON.stringify({ error: 'This date is not available for booking' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (slot.status === 'blocked') {
		return new Response(JSON.stringify({ error: 'This date is not available' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	// Private tours reserve one departure per booking (pax is headcount for pricing only).
	const capacityUnits = pkg.tour_style === 'private' ? 1 : pax;
	if (slot.booked_count + capacityUnits > slot.capacity) {
		const err =
			pkg.tour_style === 'private'
				? 'This date is already booked or not available'
				: 'Not enough spots available on this date';
		return new Response(JSON.stringify({ error: err }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Calculate price
	const breakdown = calculatePrice(pkg, pax, date, slot, tierId);

	// Get package title (English preferred)
	const packageTitle =
		pkg.i18n['en']?.title ?? pkg.i18n['ka']?.title ?? pkg.i18n['ru']?.title ?? 'Tour package';

	const selectedTier = breakdown.tier;
	// Create booking
	const bookingResult = createBooking({
		package_id: pkg.id,
		guide_id: pkg.guide_id,
		slot_id: slot.id,
		date,
		time_start: slot.time_start,
		pax,
		unit_price: breakdown.unit_price,
		total_price: breakdown.total_price,
		currency: breakdown.currency,
		discount_pct: breakdown.discount_pct,
		discount_label: breakdown.discount_label,
		tour_style: pkg.tour_style,
		tier_id: selectedTier?.id ?? null,
		tier_label: selectedTier ? `${selectedTier.label} (${selectedTier.min_pax}–${selectedTier.max_pax} pax)` : null,
		customer_name: customerName,
		customer_email: customerEmail,
		customer_phone: customerPhone,
		special_requests: specialRequests,
		package_title: packageTitle,
	});

	if (!bookingResult.ok) {
		return new Response(JSON.stringify({ error: bookingResult.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Reserve capacity — private tour counts as 1 booking regardless of pax
	incrementSlotBooked(slot.id, pkg.tour_style === 'private' ? 1 : pax);

	const booking = bookingResult.booking;

	// Send confirmation email to customer
	const confirmHtml = `
<h2>Booking Request Received</h2>
<p>Hi <strong>${customerName}</strong>,</p>
<p>Your booking request has been received and is <strong>pending confirmation</strong> from your guide.</p>
<table style="border-collapse:collapse;width:100%;max-width:480px">
  <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Booking reference</td><td style="padding:6px 12px">${booking.ref}</td></tr>
  <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Tour</td><td style="padding:6px 12px">${packageTitle}</td></tr>
  <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Date</td><td style="padding:6px 12px">${date}${slot.time_start ? ' at ' + slot.time_start : ''}</td></tr>
  ${selectedTier ? `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Tour type</td><td style="padding:6px 12px">Private — ${selectedTier.label} (${selectedTier.min_pax}–${selectedTier.max_pax} pax)</td></tr>` : ''}
  <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Guests</td><td style="padding:6px 12px">${pax} ${pax === 1 ? 'person' : 'people'}</td></tr>
  <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Total price</td><td style="padding:6px 12px">${breakdown.total_price} ${breakdown.currency}${breakdown.discount_pct > 0 ? ` <span style="color:#16a34a">(${breakdown.discount_pct}% off)</span>` : ''}</td></tr>
  ${specialRequests ? `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Special requests</td><td style="padding:6px 12px">${specialRequests}</td></tr>` : ''}
</table>
<p>The guide will confirm or follow up shortly. Your booking reference is <strong>${booking.ref}</strong> — keep this for your records.</p>
`;

	sendMail({
		to: customerEmail,
		subject: `Booking Request Received — ${booking.ref}`,
		html: confirmHtml,
	}).catch(() => {});

	// Notify admin
	notifyAdmin(
		`New booking request — ${booking.ref} (${packageTitle})`,
		`<p>New booking from <strong>${customerName}</strong> (${customerEmail}) for <strong>${packageTitle}</strong> on ${date} × ${pax} pax. Total: ${breakdown.total_price} ${breakdown.currency}.</p>`,
	);

	return new Response(JSON.stringify({ ok: true, ref: booking.ref, booking_id: booking.id }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
