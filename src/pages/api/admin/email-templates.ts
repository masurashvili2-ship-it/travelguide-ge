/**
 * GET  /api/admin/email-templates
 * POST /api/admin/email-templates
 */
import type { APIRoute } from 'astro';
import { getEmailTemplates, saveEmailTemplates } from '../../../lib/email-templates-db';
import type { EmailTemplates } from '../../../lib/email-templates-db';

function requireAdmin(locals: App.Locals) {
	return !locals.user || locals.user.role !== 'admin';
}

export const GET: APIRoute = ({ locals }) => {
	if (requireAdmin(locals)) return new Response(null, { status: 403 });
	return new Response(JSON.stringify(getEmailTemplates()), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request, locals }) => {
	if (requireAdmin(locals)) return new Response(null, { status: 403 });

	const body = (await request.json().catch(() => null)) as Partial<EmailTemplates> | null;
	if (!body) return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });

	const current = getEmailTemplates();
	const keys = Object.keys(current) as (keyof EmailTemplates)[];

	for (const key of keys) {
		if (body[key]) {
			if (typeof body[key]!.subject === 'string') current[key].subject = body[key]!.subject;
			if (typeof body[key]!.html === 'string') current[key].html = body[key]!.html;
		}
	}

	const result = saveEmailTemplates(current);
	if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 500 });
	return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
