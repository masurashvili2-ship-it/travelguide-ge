import type { APIRoute } from 'astro';
import { markRead, deleteMessage, addReply, bustMessagesCache } from '../../../../lib/messages-db';
import { sendMail, getAdminNotifyEmail } from '../../../../lib/mailer';
import { getEmailSettings } from '../../../../lib/email-settings-db';

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

/** PATCH — mark as read */
export const PATCH: APIRoute = async ({ params, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const id = params.id ?? '';
	bustMessagesCache();
	const ok = markRead(id);
	return new Response(JSON.stringify({ ok }), {
		status: ok ? 200 : 404,
		headers: { 'Content-Type': 'application/json' },
	});
};

/** DELETE — remove message */
export const DELETE: APIRoute = async ({ params, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const id = params.id ?? '';
	bustMessagesCache();
	const ok = deleteMessage(id);
	return new Response(JSON.stringify({ ok }), {
		status: ok ? 200 : 404,
		headers: { 'Content-Type': 'application/json' },
	});
};

/** POST — send reply */
export const POST: APIRoute = async ({ params, locals, request }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	const id = params.id ?? '';
	let body = '';
	let toEmail = '';

	try {
		const data = await request.json() as Record<string, unknown>;
		body = String(data.body ?? '').trim();
		toEmail = String(data.to ?? '').trim();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	if (!body) {
		return new Response(JSON.stringify({ error: 'Reply body is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}
	if (!toEmail || !toEmail.includes('@')) {
		return new Response(JSON.stringify({ error: 'Invalid recipient email.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	const s = getEmailSettings();
	const from = s.smtp_from || s.smtp_user || getAdminNotifyEmail() || '';

	const html = body
		.split('\n')
		.map((l) => `<p style="margin:0 0 .75rem;line-height:1.6">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
		.join('');

	const result = await sendMail({
		to: toEmail,
		subject: 'Re: message to travelguide.ge',
		html: `<div style="font-family:sans-serif;font-size:15px;max-width:600px">${html}<hr style="margin:1.5rem 0;border:none;border-top:1px solid #e5e7eb"><p style="color:#6b7280;font-size:13px">Travel Guide Georgia — <a href="https://travelguide.ge">travelguide.ge</a></p></div>`,
		text: body,
		replyTo: from || undefined,
	});

	if (!result.ok) {
		return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}

	bustMessagesCache();
	addReply(id, body);

	return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
