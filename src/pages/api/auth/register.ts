import type { APIRoute } from 'astro';
import { registerUser, sessionCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
	const ct = request.headers.get('content-type') ?? '';
	let email = '';
	let password = '';
	let next = '/en/';

	if (ct.includes('application/json')) {
		const body = (await request.json()) as { email?: string; password?: string; next?: string };
		email = body.email ?? '';
		password = body.password ?? '';
		next = typeof body.next === 'string' ? body.next : '/en/';
	} else {
		const form = await request.formData();
		email = String(form.get('email') ?? '');
		password = String(form.get('password') ?? '');
		next = String(form.get('next') ?? '/en/');
	}

	const result = await registerUser(email, password);
	if (!result.ok) {
		if (ct.includes('application/json')) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const err = new URL(next, request.url);
		err.searchParams.set('error', result.error);
		return Response.redirect(err, 302);
	}

	const headers = new Headers();
	headers.append('Set-Cookie', sessionCookieHeader(result.user.id));
	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, user: result.user }), {
			status: 201,
			headers,
		});
	}
	const loc = new URL(next, request.url).toString();
	headers.set('Location', loc);
	return new Response(null, { status: 302, headers });
};
