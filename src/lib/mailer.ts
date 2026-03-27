/**
 * Email sending via SMTP (Nodemailer).
 * Config is read from the admin panel (data/email-settings.json) with .env as fallback.
 */

import nodemailer from 'nodemailer';
import { getEmailSettings } from './email-settings-db';

export type MailOptions = {
	to: string;
	subject: string;
	html: string;
	replyTo?: string;
	text?: string;
};

function getSmtpConfig() {
	const s = getEmailSettings();
	const host = s.smtp_host || process.env.SMTP_HOST?.trim();
	const user = s.smtp_user || process.env.SMTP_USER?.trim();
	const pass = s.smtp_pass || process.env.SMTP_PASS?.trim();
	if (!host || !user || !pass) return null;
	const port = s.smtp_port || parseInt(process.env.SMTP_PORT?.trim() || '587', 10);
	const secure = port === 465;
	return { host, port, secure, user, pass };
}

export function isMailerConfigured(): boolean {
	return getSmtpConfig() !== null;
}

export function getAdminNotifyEmail(): string | null {
	const s = getEmailSettings();
	return (
		s.admin_notify_email ||
		process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
		s.smtp_user ||
		process.env.SMTP_USER?.trim() ||
		null
	);
}

export function isSubmissionNotifyEnabled(): boolean {
	return getEmailSettings().notify_on_submission !== false;
}

export async function sendMail(opts: MailOptions): Promise<{ ok: true } | { ok: false; error: string }> {
	const cfg = getSmtpConfig();
	if (!cfg) {
		return { ok: false, error: 'SMTP not configured — set it in Admin → Email settings.' };
	}

	const s = getEmailSettings();
	const from =
		s.smtp_from ||
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
	if (!isSubmissionNotifyEnabled()) return;
	const to = getAdminNotifyEmail();
	if (!to) return;
	sendMail({ to, subject, html }).then((r) => {
		if (!r.ok) console.error('[mailer] admin notification failed:', r.error);
	});
}
