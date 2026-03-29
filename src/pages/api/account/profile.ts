import type { APIRoute } from 'astro';
import { updateUserProfile } from '../../../lib/auth';

export const PATCH: APIRoute = async ({ locals, request }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let fullName = '';
	let phone = '';
	let displayName = '';
	try {
		const data = (await request.json()) as Record<string, unknown>;
		fullName = String(data.fullName ?? '');
		phone = String(data.phone ?? '');
		displayName = String(data.displayName ?? '');
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const result = await updateUserProfile(locals.user.id, { fullName, phone, displayName });
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
