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
import { createBooking, updateBookingPayment } from '../../../lib/bookings-db';
import { sendMail, notifyAdmin } from '../../../lib/mailer';
import { getPaymentSettings, createPayPalOrder } from '../../../lib/payment-settings-db';
import { getEmailTemplates, renderTemplate } from '../../../lib/email-templates-db';
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
	const paymentMethodRaw = String(body.payment_method ?? '').trim() || null;
	const locale = String(body.locale ?? 'en').trim();

	const validPaymentMethods = ['paypal_full', 'paypal_deposit', 'cash'] as const;
	type ValidMethod = (typeof validPaymentMethods)[number];
	const paymentMethod = validPaymentMethods.includes(paymentMethodRaw as ValidMethod)
		? (paymentMethodRaw as ValidMethod)
		: null;

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

	// Resolve payment settings
	const paySettings = getPaymentSettings();
	const depositPct = paySettings.paypal.deposit_pct;

	// Apply per-package payment method discount
	type ValidPayMethod = 'paypal_full' | 'paypal_deposit' | 'cash';
	const pkgPayOpt = paymentMethod && ['paypal_full','paypal_deposit','cash'].includes(paymentMethod)
		? pkg.payment_options[paymentMethod as ValidPayMethod]
		: null;
	const payDiscountPct = pkgPayOpt?.discount_pct ?? 0;
	const priceAfterTourDiscount = breakdown.total_price;
	const payDiscountAmount = payDiscountPct > 0
		? Math.round(priceAfterTourDiscount * payDiscountPct / 100 * 100) / 100
		: 0;
	const finalTotalPrice = Math.round((priceAfterTourDiscount - payDiscountAmount) * 100) / 100;

	// Combined discount label for records
	const combinedDiscountLabel = [
		breakdown.discount_pct > 0 ? `${breakdown.discount_label ?? 'Tour discount'} (${breakdown.discount_pct}%)` : null,
		payDiscountPct > 0 ? `Payment discount (${payDiscountPct}%)` : null,
	].filter(Boolean).join(' + ') || null;

	const depositAmount =
		paymentMethod === 'paypal_deposit'
			? Math.round(finalTotalPrice * depositPct) / 100
			: null;

	// Create booking
	const bookingResult = createBooking({
		package_id: pkg.id,
		guide_id: pkg.guide_id,
		slot_id: slot.id,
		date,
		time_start: slot.time_start,
		pax,
		unit_price: breakdown.unit_price,
		total_price: finalTotalPrice,
		currency: breakdown.currency,
		discount_pct: breakdown.discount_pct + payDiscountPct,
		discount_label: combinedDiscountLabel,
		tour_style: pkg.tour_style,
		tier_id: selectedTier?.id ?? null,
		tier_label: selectedTier ? `${selectedTier.label} (${selectedTier.min_pax}–${selectedTier.max_pax} pax)` : null,
		customer_name: customerName,
		customer_email: customerEmail,
		customer_phone: customerPhone,
		special_requests: specialRequests,
		package_title: packageTitle,
		payment_method: paymentMethod,
		deposit_amount: depositAmount,
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

	// ── PayPal payment flow ───────────────────────────────────────────────────
	if (paymentMethod === 'paypal_full' || paymentMethod === 'paypal_deposit') {
		const chargeAmount = paymentMethod === 'paypal_deposit'
			? (depositAmount ?? breakdown.total_price)
			: breakdown.total_price;

		const origin = new URL(request.url).origin;
		const orderResult = await createPayPalOrder({
			amount: chargeAmount,
			currency: breakdown.currency,
			description: `${packageTitle} — ${date} × ${pax} pax`,
			booking_id: booking.id,
			return_url: `${origin}/api/payments/paypal/capture?booking_id=${booking.id}&locale=${locale}`,
			cancel_url: `${origin}/${locale}/payment/cancel?ref=${booking.ref}`,
		});

		if (!orderResult.ok) {
			return new Response(
				JSON.stringify({ error: `PayPal error: ${orderResult.error}` }),
				{ status: 502, headers: { 'Content-Type': 'application/json' } },
			);
		}

		// Store PayPal order ID on booking
		updateBookingPayment(booking.id, { paypal_order_id: orderResult.order_id });

		return new Response(
			JSON.stringify({
				ok: true,
				ref: booking.ref,
				booking_id: booking.id,
				paypal_approval_url: orderResult.approval_url,
			}),
			{ status: 201, headers: { 'Content-Type': 'application/json' } },
		);
	}

	// ── Cash or no payment ────────────────────────────────────────────────────
	const templates = getEmailTemplates();
	const isCash = paymentMethod === 'cash';
	const template = isCash ? templates.booking_cash : templates.booking_confirmation;
	const templateVars: Record<string, string> = {
		ref: booking.ref,
		customer_name: customerName,
		tour_name: packageTitle,
		date,
		time: slot.time_start ?? '',
		pax: `${pax} ${pax === 1 ? 'person' : 'people'}`,
		total_price: String(breakdown.total_price),
		currency: breakdown.currency,
		amount_paid: '0',
		deposit_pct: String(depositPct),
		payment_method: isCash ? 'Cash (pay on tour day)' : 'Pending',
		guide_name: '',
		special_requests: specialRequests ?? '',
	};

	const rendered = renderTemplate(template, templateVars);
	sendMail({ to: customerEmail, subject: rendered.subject, html: rendered.html }).catch(() => {});

	// Admin notification
	const adminTemplate = templates.booking_admin_notify;
	const adminRendered = renderTemplate(adminTemplate, templateVars);
	notifyAdmin(adminRendered.subject, adminRendered.html);

	return new Response(JSON.stringify({ ok: true, ref: booking.ref, booking_id: booking.id }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
