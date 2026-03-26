import type { APIRoute } from 'astro';
import { isJsonRequestBody } from '../../../lib/admin-save-response';
import { withdrawSubmission } from '../../../lib/submissions-db';

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const ct = request.headers.get('content-type') ?? '';
	if (!isJsonRequestBody(ct)) {
		return new Response(JSON.stringify({ error: 'Expected application/json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = (await request.json()) as { submissionId?: string };
	const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
	if (!submissionId) {
		return new Response(JSON.stringify({ error: 'Missing submissionId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = withdrawSubmission(submissionId, locals.user.id);
	if (!result.ok) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
