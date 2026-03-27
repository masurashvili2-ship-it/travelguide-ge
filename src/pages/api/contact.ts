import type { APIRoute } from 'astro';
import { getAdminNotifyEmail, sendMail } from '../../lib/mailer';
import { addMessage, bustMessagesCache } from '../../lib/messages-db';

function escHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/\n/g, '<br>');
}

export const POST: APIRoute = async ({ request }) => {
	const ct = request.headers.get('content-type') ?? '';
	let name = '', email = '', subject = '', message = '';

	if (ct.includes('application/json')) {
		const body = await request.json() as Record<string, unknown>;
		name = String(body.name ?? '').trim();
		email = String(body.email ?? '').trim();
		subject = String(body.subject ?? '').trim();
		message = String(body.message ?? '').trim();
	} else {
		const fd = await request.formData();
		name = String(fd.get('name') ?? '').trim();
		email = String(fd.get('email') ?? '').trim();
		subject = String(fd.get('subject') ?? '').trim();
		message = String(fd.get('message') ?? '').trim();
	}

	if (!name || !email || !message) {
		return new Response(JSON.stringify({ ok: false, error: 'Name, email and message are required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!email.includes('@')) {
		return new Response(JSON.stringify({ ok: false, error: 'Enter a valid email address.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (message.length > 5000) {
		return new Response(JSON.stringify({ ok: false, error: 'Message is too long (max 5000 chars).' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Always save to inbox regardless of SMTP config
	bustMessagesCache();
	addMessage({ name, email, subject, body: message });

	const to = getAdminNotifyEmail();
	if (!to) {
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const subjectLine = subject
		? `[Contact] ${subject}`
		: `[Contact] Message from ${name}`;

	const html = `
<h2 style="margin:0 0 1rem">New contact message</h2>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:15px">
  <tr><td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap"><strong>Name</strong></td><td>${escHtml(name)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap"><strong>Email</strong></td><td><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td></tr>
  ${subject ? `<tr><td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap"><strong>Subject</strong></td><td>${escHtml(subject)}</td></tr>` : ''}
  <tr><td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap;vertical-align:top"><strong>Message</strong></td><td style="line-height:1.6">${escHtml(message)}</td></tr>
</table>
`.trim();

	const result = await sendMail({
		to,
		subject: subjectLine,
		html,
		replyTo: email,
		text: `From: ${name} <${email}>\n\n${message}`,
	});

	if (!result.ok) {
		return new Response(JSON.stringify({ ok: false, error: 'Failed to send. Please try again.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
