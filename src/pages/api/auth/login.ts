import type { APIRoute } from 'astro';
import {
	localeAuthPagePath,
	publicOriginFromRequest,
	sanitizeAuthNextPath,
	sessionCookieHeader,
	verifyLogin,
} from '../../../lib/auth';

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

	next = sanitizeAuthNextPath(next, '/en/');

	const user = await verifyLogin(email, password);
	if (!user) {
		if (ct.includes('application/json')) {
			return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store',
				},
			});
		}
		const origin = `${publicOriginFromRequest(request)}/`;
		const loginPage = new URL(localeAuthPagePath(next, 'login'), origin);
		loginPage.searchParams.set('next', next);
		loginPage.searchParams.set('error', 'invalid_credentials');
		return Response.redirect(loginPage.toString(), 302);
	}

	const headers = new Headers();
	headers.set('Cache-Control', 'no-store');
	headers.append('Set-Cookie', sessionCookieHeader(user, request));
	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, user }), { status: 200, headers });
	}
	const target = new URL(next, `${publicOriginFromRequest(request)}/`);
	target.searchParams.set('signed_in', '1');
	headers.set('Location', target.toString());
	return new Response(null, { status: 303, headers });
};
