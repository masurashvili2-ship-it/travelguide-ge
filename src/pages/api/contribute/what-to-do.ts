import type { APIRoute } from 'astro';
import { parseTourLikeContributionPayload } from '../../../lib/contribute-payload-parse';
import { addContentSubmission } from '../../../lib/submissions-db';
import { notifyAdmin } from '../../../lib/mailer';

function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> | null {
	return locals.user ?? null;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const user = requireUser(locals);
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const fd = await request.formData();
	const parsed = parseTourLikeContributionPayload(fd, 'what-to-do');
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const added = addContentSubmission('what-to-do', parsed.payload, { userId: user.id, email: user.email });
	if (!added.ok) {
		return new Response(JSON.stringify({ error: added.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	notifyAdmin(
		'[TravelGuide] New "What to do" submission',
		`<p>A new <strong>What-to-do</strong> submission has arrived from <strong>${user.email}</strong>.</p>
<p>Submission ID: <code>${added.id}</code></p>
<p>Review it in the <a href="/en/admin/what-to-do">admin panel</a>.</p>`,
	);

	return new Response(JSON.stringify({ ok: true, submissionId: added.id }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
