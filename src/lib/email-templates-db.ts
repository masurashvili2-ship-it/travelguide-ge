import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDataDir } from './data-dir';

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, 'email-templates.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateKey =
	| 'booking_confirmation'
	| 'booking_cash'
	| 'deposit_paid'
	| 'payment_full'
	| 'booking_admin_notify';

export type EmailTemplate = {
	subject: string;
	html: string;
};

export type EmailTemplates = Record<TemplateKey, EmailTemplate>;

/** Variables available in all booking templates */
export const TEMPLATE_VARS = [
	'{{ref}}',
	'{{customer_name}}',
	'{{tour_name}}',
	'{{date}}',
	'{{time}}',
	'{{pax}}',
	'{{total_price}}',
	'{{currency}}',
	'{{amount_paid}}',
	'{{deposit_pct}}',
	'{{payment_method}}',
	'{{guide_name}}',
	'{{special_requests}}',
];

const DEFAULTS: EmailTemplates = {
	booking_confirmation: {
		subject: 'Booking Request Received — {{ref}}',
		html: `<h2>Booking Request Received</h2>
<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Your booking request has been received and is <strong>pending confirmation</strong> from your guide.</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Reference</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{ref}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Tour</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{tour_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{date}} {{time}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Guests</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{pax}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Total price</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{total_price}} {{currency}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Payment</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{payment_method}}</td></tr>
</table>
<p>The guide will confirm shortly. Keep your reference <strong>{{ref}}</strong> for your records.</p>`,
	},
	booking_cash: {
		subject: 'Booking Confirmed — Pay in Cash — {{ref}}',
		html: `<h2>Your Tour is Booked!</h2>
<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Your tour booking is confirmed. Please pay your guide <strong>{{total_price}} {{currency}}</strong> in cash on the day of the tour.</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Reference</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{ref}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Tour</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{tour_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{date}} {{time}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Guests</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{pax}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Amount due</td><td style="padding:8px 12px;border:1px solid #e2e8f0"><strong>{{total_price}} {{currency}} — cash on tour day</strong></td></tr>
</table>`,
	},
	deposit_paid: {
		subject: 'Deposit Paid — {{ref}}',
		html: `<h2>Deposit Received!</h2>
<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>We have received your deposit payment of <strong>{{amount_paid}} {{currency}}</strong> ({{deposit_pct}}% deposit).</p>
<p>The remaining balance of <strong>{{total_price}} {{currency}}</strong> is due on the day of the tour.</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Reference</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{ref}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Tour</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{tour_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{date}} {{time}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Deposit paid</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{amount_paid}} {{currency}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Remaining</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{total_price}} {{currency}} — due on tour day</td></tr>
</table>`,
	},
	payment_full: {
		subject: 'Payment Confirmed — {{ref}}',
		html: `<h2>Payment Confirmed!</h2>
<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Your full payment of <strong>{{amount_paid}} {{currency}}</strong> has been received. Your tour is confirmed!</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Reference</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{ref}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Tour</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{tour_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{date}} {{time}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Amount paid</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{amount_paid}} {{currency}}</td></tr>
</table>
<p>See you on your tour!</p>`,
	},
	booking_admin_notify: {
		subject: 'New Booking — {{ref}} ({{tour_name}})',
		html: `<h2>New Booking Request</h2>
<p>A new booking has been received.</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Reference</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{ref}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Customer</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{customer_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Tour</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{tour_name}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{date}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Guests</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{pax}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Total</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{total_price}} {{currency}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Payment</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{payment_method}}</td></tr>
  <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;border:1px solid #e2e8f0">Special requests</td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{special_requests}}</td></tr>
</table>`,
	},
};

// ─── I/O ──────────────────────────────────────────────────────────────────────

function ensureDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

export function getEmailTemplates(): EmailTemplates {
	ensureDir();
	if (!existsSync(STORE_FILE)) return structuredClone(DEFAULTS);
	try {
		const raw = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as Partial<EmailTemplates>;
		const result = structuredClone(DEFAULTS);
		for (const key of Object.keys(DEFAULTS) as TemplateKey[]) {
			if (raw[key]?.subject) result[key].subject = raw[key]!.subject;
			if (raw[key]?.html) result[key].html = raw[key]!.html;
		}
		return result;
	} catch {
		return structuredClone(DEFAULTS);
	}
}

export function saveEmailTemplates(
	templates: EmailTemplates,
): { ok: true } | { ok: false; error: string } {
	try {
		ensureDir();
		writeFileSync(STORE_FILE, JSON.stringify(templates, null, 2) + '\n', 'utf8');
		return { ok: true };
	} catch {
		return { ok: false, error: 'Failed to save templates' };
	}
}

/** Replace template variables with actual values */
export function renderTemplate(
	template: EmailTemplate,
	vars: Partial<Record<string, string>>,
): { subject: string; html: string } {
	let subject = template.subject;
	let html = template.html;
	for (const [k, v] of Object.entries(vars)) {
		const placeholder = `{{${k}}}`;
		subject = subject.replaceAll(placeholder, v ?? '');
		html = html.replaceAll(placeholder, v ?? '');
	}
	return { subject, html };
}
