import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'payment-settings.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export type PayPalMode = 'sandbox' | 'live';

export type PaymentSettings = {
	paypal: {
		enabled: boolean;
		mode: PayPalMode;
		client_id: string;
		client_secret: string;
		/** Deposit percentage (0–100). 0 = deposit disabled */
		deposit_pct: number;
	};
	cash: {
		enabled: boolean;
		instructions: string;
	};
};

const DEFAULTS: PaymentSettings = {
	paypal: {
		enabled: false,
		mode: 'sandbox',
		client_id: '',
		client_secret: '',
		deposit_pct: 30,
	},
	cash: {
		enabled: true,
		instructions: 'Pay your guide in cash on the day of the tour.',
	},
};

// ─── I/O ──────────────────────────────────────────────────────────────────────

function ensureDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

export function getPaymentSettings(): PaymentSettings {
	ensureDir();
	if (!existsSync(STORE_FILE)) return structuredClone(DEFAULTS);
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Partial<PaymentSettings>;
		return {
			paypal: {
				enabled: raw.paypal?.enabled ?? DEFAULTS.paypal.enabled,
				mode: raw.paypal?.mode === 'live' ? 'live' : 'sandbox',
				client_id: raw.paypal?.client_id ?? '',
				client_secret: raw.paypal?.client_secret ?? '',
				deposit_pct: typeof raw.paypal?.deposit_pct === 'number'
					? Math.min(100, Math.max(0, raw.paypal.deposit_pct))
					: DEFAULTS.paypal.deposit_pct,
			},
			cash: {
				enabled: raw.cash?.enabled ?? DEFAULTS.cash.enabled,
				instructions: raw.cash?.instructions ?? DEFAULTS.cash.instructions,
			},
		};
	} catch {
		return structuredClone(DEFAULTS);
	}
}

export function savePaymentSettings(
	settings: PaymentSettings,
): { ok: true } | { ok: false; error: string } {
	try {
		ensureDir();
		writeFileSync(STORE_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf8');
		return { ok: true };
	} catch {
		return { ok: false, error: 'Failed to save payment settings' };
	}
}

// ─── PayPal helpers ───────────────────────────────────────────────────────────

function paypalBaseUrl(mode: PayPalMode): string {
	return mode === 'live'
		? 'https://api-m.paypal.com'
		: 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalAccessToken(): Promise<string | null> {
	const s = getPaymentSettings();
	if (!s.paypal.enabled || !s.paypal.client_id || !s.paypal.client_secret) return null;
	try {
		const res = await fetch(`${paypalBaseUrl(s.paypal.mode)}/v1/oauth2/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${Buffer.from(`${s.paypal.client_id}:${s.paypal.client_secret}`).toString('base64')}`,
			},
			body: 'grant_type=client_credentials',
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { access_token?: string };
		return data.access_token ?? null;
	} catch {
		return null;
	}
}

export type PayPalOrderResult =
	| { ok: true; order_id: string; approval_url: string }
	| { ok: false; error: string };

export async function createPayPalOrder(opts: {
	amount: number;
	currency: string;
	description: string;
	booking_id: string;
	return_url: string;
	cancel_url: string;
}): Promise<PayPalOrderResult> {
	const s = getPaymentSettings();
	const token = await getPayPalAccessToken();
	if (!token) return { ok: false, error: 'PayPal not configured or auth failed' };

	const body = {
		intent: 'CAPTURE',
		purchase_units: [
			{
				amount: {
					currency_code: opts.currency,
					value: opts.amount.toFixed(2),
				},
				description: opts.description.slice(0, 127),
				custom_id: opts.booking_id,
			},
		],
		application_context: {
			return_url: opts.return_url,
			cancel_url: opts.cancel_url,
			brand_name: 'TravelGeorgia.ge',
			user_action: 'PAY_NOW',
		},
	};

	try {
		const res = await fetch(`${paypalBaseUrl(s.paypal.mode)}/v2/checkout/orders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				'PayPal-Request-Id': `${opts.booking_id}-${Date.now()}`,
			},
			body: JSON.stringify(body),
		});
		const data = (await res.json()) as {
			id?: string;
			links?: { rel: string; href: string }[];
			message?: string;
		};
		if (!res.ok || !data.id) {
			return { ok: false, error: data.message ?? 'Failed to create PayPal order' };
		}
		const approvalLink = data.links?.find((l) => l.rel === 'approve');
		if (!approvalLink) return { ok: false, error: 'No approval URL from PayPal' };
		return { ok: true, order_id: data.id, approval_url: approvalLink.href };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'PayPal request failed' };
	}
}

export type PayPalCaptureResult =
	| { ok: true; capture_id: string; amount: number; currency: string; booking_id: string }
	| { ok: false; error: string };

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
	const s = getPaymentSettings();
	const token = await getPayPalAccessToken();
	if (!token) return { ok: false, error: 'PayPal auth failed' };

	try {
		const res = await fetch(
			`${paypalBaseUrl(s.paypal.mode)}/v2/checkout/orders/${orderId}/capture`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			},
		);
		const data = (await res.json()) as {
			id?: string;
			status?: string;
			purchase_units?: {
				payments?: {
					captures?: {
						id: string;
						amount: { value: string; currency_code: string };
					}[];
				};
				custom_id?: string;
			}[];
			message?: string;
		};
		if (!res.ok) return { ok: false, error: data.message ?? 'Capture failed' };
		const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
		const bookingId = data.purchase_units?.[0]?.custom_id ?? '';
		if (!capture) return { ok: false, error: 'No capture data in response' };
		return {
			ok: true,
			capture_id: capture.id,
			amount: parseFloat(capture.amount.value),
			currency: capture.amount.currency_code,
			booking_id: bookingId,
		};
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Capture request failed' };
	}
}
