import type { APIRoute } from 'astro';
import {
	parsePageContributionPayloadFromFormData,
	parseTourLikeContributionPayload,
} from '../../../../lib/contribute-payload-parse';
import {
	deleteSubmissionPermanently,
	getSubmissionById,
	updatePendingSubmission,
} from '../../../../lib/submissions-db';

function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> | null {
	return locals.user ?? null;
}

export const POST: APIRoute = async ({ params, request, locals }) => {
	const user = requireUser(locals);
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const id = params.id?.trim();
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const sub = getSubmissionById(id);
	if (!sub || sub.author_user_id !== user.id) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const fd = await request.formData();

	if (sub.kind === 'what-to-do') {
		const parsed = parseTourLikeContributionPayload(fd);
		if (!parsed.ok) {
			return new Response(JSON.stringify({ error: parsed.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const result = updatePendingSubmission(id, user.id, parsed.payload);
		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} else if (sub.kind === 'page') {
		const parsed = parsePageContributionPayloadFromFormData(fd);
		if (!parsed.ok) {
			return new Response(JSON.stringify({ error: parsed.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const result = updatePendingSubmission(id, user.id, parsed.payload);
		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} else {
		return new Response(JSON.stringify({ error: 'Unsupported submission type' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true, updated: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const DELETE: APIRoute = async ({ params, locals }) => {
	const user = requireUser(locals);
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const id = params.id?.trim();
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = deleteSubmissionPermanently(id, user.id);
	if (!result.ok) {
		const status = result.error.includes('Not your') || result.error.includes('not found') ? 404 : 400;
		return new Response(JSON.stringify({ error: result.error }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ ok: true, deleted: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
