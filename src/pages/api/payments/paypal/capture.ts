/**
 * GET /api/payments/paypal/capture?token=ORDER_ID&booking_id=...
 * PayPal redirects here after the user approves the payment.
 */
import type { APIRoute } from 'astro';
import { capturePayPalOrder } from '../../../../lib/payment-settings-db';
import { getBookingById, updateBookingPayment } from '../../../../lib/bookings-db';
import { sendMail } from '../../../../lib/mailer';
import { getEmailTemplates, renderTemplate } from '../../../../lib/email-templates-db';

export const GET: APIRoute = async ({ url, redirect }) => {
	const token = url.searchParams.get('token'); // PayPal order ID
	const bookingId = url.searchParams.get('booking_id');
	const locale = url.searchParams.get('locale') ?? 'en';

	if (!token) {
		return redirect(`/${locale}/payment/cancel?error=no_token`);
	}

	const result = await capturePayPalOrder(token);

	if (!result.ok) {
		return redirect(`/${locale}/payment/cancel?error=${encodeURIComponent(result.error)}`);
	}

	// Resolve booking — prefer explicit booking_id, fall back to custom_id from PayPal response
	const bid = bookingId ?? result.booking_id;
	if (!bid) {
		return redirect(`/${locale}/payment/cancel?error=no_booking`);
	}

	const booking = getBookingById(bid);
	if (!booking) {
		return redirect(`/${locale}/payment/cancel?error=booking_not_found`);
	}

	const isDeposit = booking.payment_method === 'paypal_deposit';
	const paymentStatus = isDeposit ? 'deposit_paid' : 'fully_paid';

	updateBookingPayment(bid, {
		payment_status: paymentStatus,
		amount_paid: result.amount,
		paypal_capture_id: result.capture_id,
		paypal_order_id: token,
	});

	// Send email
	try {
		const templates = getEmailTemplates();
		const template = isDeposit ? templates.deposit_paid : templates.payment_full;
		const vars: Record<string, string> = {
			ref: booking.ref,
			customer_name: booking.customer_name,
			tour_name: booking.package_title,
			date: booking.date,
			time: booking.time_start ?? '',
			pax: String(booking.pax),
			total_price: String(booking.total_price),
			currency: booking.currency,
			amount_paid: String(result.amount),
			deposit_pct: booking.deposit_amount
				? String(Math.round((booking.deposit_amount / booking.total_price) * 100))
				: '',
			payment_method: isDeposit ? 'PayPal (deposit)' : 'PayPal (full payment)',
			guide_name: '',
			special_requests: booking.special_requests ?? '',
		};
		const rendered = renderTemplate(template, vars);
		await sendMail({ to: booking.customer_email, subject: rendered.subject, html: rendered.html });
	} catch {
		// email failure is non-fatal
	}

	return redirect(`/${locale}/payment/success?ref=${encodeURIComponent(booking.ref)}`);
};
