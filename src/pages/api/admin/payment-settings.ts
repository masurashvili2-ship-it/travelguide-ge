/**
 * GET  /api/admin/payment-settings — read settings
 * POST /api/admin/payment-settings — save settings
 */
import type { APIRoute } from 'astro';
import { getPaymentSettings, savePaymentSettings } from '../../../lib/payment-settings-db';
import type { PaymentSettings } from '../../../lib/payment-settings-db';

function requireAdmin(locals: App.Locals) {
	return !locals.user || locals.user.role !== 'admin';
}

export const GET: APIRoute = ({ locals }) => {
	if (requireAdmin(locals)) return new Response(null, { status: 403 });
	const s = getPaymentSettings();
	// Never expose secret in GET — mask it
	const safe = structuredClone(s);
	if (safe.paypal.client_secret) {
		safe.paypal.client_secret = '••••••••';
	}
	return new Response(JSON.stringify(safe), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (requireAdmin(locals)) return new Response(null, { status: 403 });

	const body = (await request.json().catch(() => null)) as Partial<PaymentSettings> | null;
	if (!body) return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });

	const current = getPaymentSettings();

	const updated: PaymentSettings = {
		paypal: {
			enabled: body.paypal?.enabled ?? current.paypal.enabled,
			mode: body.paypal?.mode === 'live' ? 'live' : 'sandbox',
			client_id: body.paypal?.client_id ?? current.paypal.client_id,
			// If masked placeholder sent, keep current secret
			client_secret:
				body.paypal?.client_secret && !body.paypal.client_secret.startsWith('•')
					? body.paypal.client_secret
					: current.paypal.client_secret,
			deposit_pct:
				typeof body.paypal?.deposit_pct === 'number'
					? Math.min(100, Math.max(1, body.paypal.deposit_pct))
					: current.paypal.deposit_pct,
		},
		cash: {
			enabled: body.cash?.enabled ?? current.cash.enabled,
			instructions: body.cash?.instructions ?? current.cash.instructions,
		},
	};

	const result = savePaymentSettings(updated);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), { status: 500 });
	}
	return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
