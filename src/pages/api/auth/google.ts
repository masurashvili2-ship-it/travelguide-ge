import { randomBytes } from 'node:crypto';
import type { APIRoute } from 'astro';
import {
	getGoogleOAuthConfig,
	oauthNextCookieHeader,
	oauthStateCookieHeader,
	publicOriginFromRequest,
	sanitizeAuthNextPath,
} from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
	const cfg = getGoogleOAuthConfig();
	if (!cfg) {
		return new Response('Google sign-in is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	const url = new URL(request.url);
	const nextRaw = url.searchParams.get('next') ?? '/en/';
	const next = sanitizeAuthNextPath(nextRaw, '/en/');
	const state = randomBytes(24).toString('hex');
	const origin = publicOriginFromRequest(request);
	const redirectUri = `${origin}/api/auth/google/callback`;

	const params = new URLSearchParams({
		client_id: cfg.clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'online',
		prompt: 'select_account',
	});

	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
	const headers = new Headers();
	headers.append('Set-Cookie', oauthStateCookieHeader(state, request));
	headers.append('Set-Cookie', oauthNextCookieHeader(next, request));
	headers.set('Location', authUrl);
	headers.set('Cache-Control', 'no-store');
	return new Response(null, { status: 302, headers });
};
