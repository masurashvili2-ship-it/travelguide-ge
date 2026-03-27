import type { APIRoute } from 'astro';
import { saveEmailSettings, bustEmailSettingsCache } from '../../../lib/email-settings-db';

function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user || locals.user.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return null;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(locals);
	if (denied) return denied;

	let body: Record<string, unknown>;
	try {
		body = await request.json() as Record<string, unknown>;
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const smtp_host   = String(body.smtp_host ?? '').trim();
	const smtp_port   = parseInt(String(body.smtp_port ?? '587'), 10) || 587;
	const smtp_user   = String(body.smtp_user ?? '').trim();
	const smtp_from   = String(body.smtp_from ?? '').trim();
	const admin_notify_email = String(body.admin_notify_email ?? '').trim();
	const notify_on_submission = body.notify_on_submission !== false;

	// Only update password if a non-empty value was sent
	const patch: Parameters<typeof saveEmailSettings>[0] = {
		smtp_host,
		smtp_port,
		smtp_user,
		smtp_from,
		admin_notify_email,
		notify_on_submission,
	};

	const rawPass = String(body.smtp_pass ?? '').trim();
	if (rawPass) patch.smtp_pass = rawPass;

	bustEmailSettingsCache();
	const saved = saveEmailSettings(patch);

	return new Response(JSON.stringify({ ok: true, updated_at: saved.updated_at }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
