/**
 * Email sending via SMTP (Nodemailer).
 *
 * Required env vars (set in .env locally; hosting platform for production):
 *   SMTP_HOST     — e.g. smtp.gmail.com
 *   SMTP_PORT     — e.g. 587 (TLS) or 465 (SSL)
 *   SMTP_USER     — your full email address
 *   SMTP_PASS     — Gmail App Password (16 chars, no spaces)
 *   SMTP_FROM     — (optional) display name + address, e.g. "Travel Guide <you@gmail.com>"
 *   ADMIN_NOTIFY_EMAIL — (optional) address that receives site notifications (defaults to SMTP_USER)
 *
 * Gmail setup:
 *   1. Google Account → Security → 2-Step Verification (must be ON)
 *   2. Google Account → Security → App passwords → create one for "Mail"
 *   3. Use the 16-char App Password as SMTP_PASS (NOT your Google account password)
 */

import nodemailer from 'nodemailer';

export type MailOptions = {
	to: string;
	subject: string;
	html: string;
	replyTo?: string;
	text?: string;
};

function getSmtpConfig() {
	const host = process.env.SMTP_HOST?.trim();
	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASS?.trim();
	if (!host || !user || !pass) return null;
	const port = parseInt(process.env.SMTP_PORT?.trim() || '587', 10);
	const secure = port === 465;
	return { host, port, secure, user, pass };
}

export function isMailerConfigured(): boolean {
	return getSmtpConfig() !== null;
}

export function getAdminNotifyEmail(): string | null {
	return (
		process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
		process.env.SMTP_USER?.trim() ||
		null
	);
}

export async function sendMail(opts: MailOptions): Promise<{ ok: true } | { ok: false; error: string }> {
	const cfg = getSmtpConfig();
	if (!cfg) {
		return { ok: false, error: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)' };
	}

	const from =
		process.env.SMTP_FROM?.trim() ||
		`Travel Guide Georgia <${cfg.user}>`;

	const transporter = nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: { user: cfg.user, pass: cfg.pass },
	});

	try {
		await transporter.sendMail({
			from,
			to: opts.to,
			subject: opts.subject,
			html: opts.html,
			text: opts.text,
			replyTo: opts.replyTo,
		});
		return { ok: true };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[mailer] sendMail failed:', msg);
		return { ok: false, error: msg };
	}
}

/** Fire-and-forget admin notification — errors are logged, never thrown. */
export function notifyAdmin(subject: string, html: string): void {
	const to = getAdminNotifyEmail();
	if (!to) return;
	sendMail({ to, subject, html }).then((r) => {
		if (!r.ok) console.error('[mailer] admin notification failed:', r.error);
	});
}
