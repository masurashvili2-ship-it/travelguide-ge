import type { APIRoute } from 'astro';
import { isJsonRequestBody } from '../../../../lib/admin-save-response';
import { approveSubmission, rejectSubmission } from '../../../../lib/submissions-db';

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

	const ct = request.headers.get('content-type') ?? '';
	if (!isJsonRequestBody(ct)) {
		return new Response(JSON.stringify({ error: 'Expected application/json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const body = (await request.json()) as {
		submissionId?: string;
		action?: string;
		reason?: string;
	};
	const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
	const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
	if (!submissionId || (action !== 'approve' && action !== 'reject')) {
		return new Response(JSON.stringify({ error: 'Invalid submissionId or action' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const reviewer = locals.user!.email;

	if (action === 'approve') {
		const result = approveSubmission(submissionId, reviewer);
		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(
			JSON.stringify({ ok: true, publishedId: result.publishedId }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const reason = typeof body.reason === 'string' ? body.reason : '';
	const rej = rejectSubmission(submissionId, reviewer, reason);
	if (!rej.ok) {
		return new Response(JSON.stringify({ error: rej.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
