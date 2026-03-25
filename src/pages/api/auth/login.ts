import type { APIRoute } from 'astro';
import { sessionCookieHeader, verifyLogin } from '../../../lib/auth';

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

	const user = await verifyLogin(email, password);
	if (!user) {
		if (ct.includes('application/json')) {
			return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const err = new URL(next, request.url);
		err.searchParams.set('error', 'Invalid email or password');
		return Response.redirect(err, 302);
	}

	const headers = new Headers();
	headers.append('Set-Cookie', sessionCookieHeader(user.id));
	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, user }), { status: 200, headers });
	}
	const loc = new URL(next, request.url).toString();
	headers.set('Location', loc);
	return new Response(null, { status: 302, headers });
};
