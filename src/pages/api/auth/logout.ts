import type { APIRoute } from 'astro';
import { clearSessionCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
	const headers = new Headers();
	headers.append('Set-Cookie', clearSessionCookieHeader());

	const ref = request.headers.get('referer');
	let next = '/en/';
	if (ref) {
		try {
			const u = new URL(ref);
			next = `${u.pathname}${u.search}` || '/en/';
		} catch {
			/* keep default */
		}
	}

	const ct = request.headers.get('content-type') ?? '';
	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
	}
	const loc = new URL(next, request.url).toString();
	headers.set('Location', loc);
	return new Response(null, { status: 302, headers });
};
