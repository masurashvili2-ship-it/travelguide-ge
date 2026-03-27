import type { APIRoute } from 'astro';
import { bustEmailSettingsCache } from '../../../../lib/email-settings-db';
import { sendMail, getAdminNotifyEmail } from '../../../../lib/mailer';

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

export const POST: APIRoute = async ({ locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	// Bust cache so any unsaved-but-env-based config is re-read fresh
	bustEmailSettingsCache();

	const to = getAdminNotifyEmail();
	if (!to) {
		return new Response(
			JSON.stringify({ ok: false, error: 'No destination email configured. Set SMTP User or Admin Notify Email.' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const result = await sendMail({
		to,
		subject: '[TravelGuide] Test email from admin panel',
		html: `<h2>It works!</h2><p>Your email settings are configured correctly.<br>Sent from the admin panel at ${new Date().toUTCString()}.</p>`,
		text: `It works! Email settings are configured correctly. Sent at ${new Date().toUTCString()}.`,
	});

	if (!result.ok) {
		return new Response(JSON.stringify({ ok: false, error: result.error }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true, sentTo: to }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
