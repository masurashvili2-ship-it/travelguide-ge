import type { APIRoute } from 'astro';
import { publicOriginFromRequest, readUsers } from '../../../../lib/auth';
import { isMailerConfigured, sendMail } from '../../../../lib/mailer';
import {
	appendPlatformMessage,
	getThreadForUser,
	otherParticipantId,
} from '../../../../lib/platform-messages-db';

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const POST: APIRoute = async ({ params, locals, request }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const threadId = params.threadId ?? '';
	if (!threadId) {
		return new Response(JSON.stringify({ error: 'Missing thread' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body = '';
	try {
		const data = (await request.json()) as Record<string, unknown>;
		body = String(data.body ?? '');
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = appendPlatformMessage(threadId, locals.user.id, body);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: result.error === 'Forbidden' ? 403 : 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const thread = getThreadForUser(threadId, locals.user.id);
	const otherId = thread ? otherParticipantId(thread, locals.user.id) : undefined;
	if (otherId && isMailerConfigured()) {
		const users = await readUsers();
		const recipient = users.find((u) => u.id === otherId);
		const sender = users.find((u) => u.id === locals.user!.id);
		if (recipient?.email) {
			const origin = publicOriginFromRequest(request);
			const inboxUrl = `${origin}/en/account/messages/${encodeURIComponent(threadId)}`;
			const fromLabel = esc(sender?.displayName?.trim() || sender?.email || 'Someone');
			const preview = esc(result.message.body.length > 400 ? `${result.message.body.slice(0, 397)}…` : result.message.body);
			await sendMail({
				to: recipient.email,
				subject: `New message from ${sender?.displayName?.trim() || sender?.email || 'Travel Guide Georgia'}`,
				html: `<div style="font-family:system-ui,sans-serif;font-size:15px;max-width:560px;line-height:1.5">
<p><strong>${fromLabel}</strong> sent you a message on Travel Guide Georgia:</p>
<p style="white-space:pre-wrap;border-left:3px solid #e5e7eb;padding-left:12px;margin:1rem 0">${preview}</p>
<p><a href="${inboxUrl}" style="display:inline-block;margin-top:0.5rem;font-weight:600">Open your messages</a></p>
<p style="color:#6b7280;font-size:13px;margin-top:1.5rem">You are receiving this because you have a booking conversation on the site.</p>
</div>`,
				text: `${sender?.displayName || sender?.email || 'Someone'} wrote:\n\n${result.message.body}\n\n${inboxUrl}`,
			});
		}
	}

	return new Response(JSON.stringify({ ok: true, message: result.message }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
