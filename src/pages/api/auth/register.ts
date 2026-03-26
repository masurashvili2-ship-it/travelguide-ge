import type { APIRoute } from 'astro';
import {
	localeAuthPagePath,
	publicOriginFromRequest,
	registerUser,
	sanitizeAuthNextPath,
	sessionCookieHeader,
} from '../../../lib/auth';

function registerErrorCode(message: string): string {
	switch (message) {
		case 'Invalid email':
			return 'invalid_email';
		case 'Email already registered':
			return 'email_taken';
		case 'Password must be at least 8 characters':
			return 'password_short';
		default:
			return 'generic';
	}
}

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

	const result = await registerUser(email, password);
	if (!result.ok) {
		if (ct.includes('application/json')) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const origin = `${publicOriginFromRequest(request)}/`;
		const registerPage = new URL(localeAuthPagePath(next, 'register'), origin);
		registerPage.searchParams.set('next', next);
		registerPage.searchParams.set('error', registerErrorCode(result.error));
		return Response.redirect(registerPage.toString(), 302);
	}

	const headers = new Headers();
	headers.append('Set-Cookie', sessionCookieHeader(result.user, request));
	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, user: result.user }), {
			status: 201,
			headers,
		});
	}
	const target = new URL(next, `${publicOriginFromRequest(request)}/`);
	target.searchParams.set('signed_up', '1');
	headers.set('Location', target.toString());
	return new Response(null, { status: 303, headers });
};
