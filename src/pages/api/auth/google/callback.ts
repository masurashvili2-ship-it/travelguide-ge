import type { APIRoute } from 'astro';
import {
	clearOAuthCookieHeaders,
	getCookieFromHeader,
	getGoogleOAuthConfig,
	localeAuthPagePath,
	publicOriginFromRequest,
	registerOrLoginGoogleUser,
	sanitizeAuthNextPath,
	sessionCookieHeader,
} from '../../../../lib/auth';
import { appendUserActivity } from '../../../../lib/user-activity';

type GoogleTokenResponse = {
	access_token?: string;
	token_type?: string;
	error?: string;
};

type GoogleUserInfo = {
	sub?: string;
	email?: string;
	name?: string;
};

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const err = url.searchParams.get('error');
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookieHeader = request.headers.get('cookie');
	const nextFromCookie = getCookieFromHeader(cookieHeader, 'oauth_next') ?? '/en/';
	const next = sanitizeAuthNextPath(nextFromCookie, '/en/');
	const origin = `${publicOriginFromRequest(request)}/`;

	const redirectLogin = (reason: string) => {
		const loginPage = new URL(localeAuthPagePath(next, 'login'), origin);
		loginPage.searchParams.set('next', next);
		loginPage.searchParams.set('error', reason);
		const headers = new Headers();
		for (const c of clearOAuthCookieHeaders(request)) {
			headers.append('Set-Cookie', c);
		}
		headers.set('Location', loginPage.toString());
		headers.set('Cache-Control', 'no-store');
		return new Response(null, { status: 303, headers });
	};

	if (err) {
		return redirectLogin('google_denied');
	}

	const cfg = getGoogleOAuthConfig();
	if (!cfg || !code || !state) {
		return redirectLogin('google_failed');
	}

	const expectedState = getCookieFromHeader(cookieHeader, 'oauth_state');
	if (!expectedState || expectedState !== state) {
		return redirectLogin('google_failed');
	}

	const redirectUri = `${publicOriginFromRequest(request)}/api/auth/google/callback`;
	const body = new URLSearchParams({
		code,
		client_id: cfg.clientId,
		client_secret: cfg.clientSecret,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code',
	});

	let tokenJson: GoogleTokenResponse;
	try {
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		});
		tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
	} catch {
		return redirectLogin('google_failed');
	}

	if (!tokenJson.access_token || tokenJson.error) {
		return redirectLogin('google_failed');
	}

	let info: GoogleUserInfo;
	try {
		const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${tokenJson.access_token}` },
		});
		info = (await infoRes.json()) as GoogleUserInfo;
	} catch {
		return redirectLogin('google_failed');
	}

	const sub = typeof info.sub === 'string' ? info.sub : '';
	const email = typeof info.email === 'string' ? info.email : '';
	const name = typeof info.name === 'string' ? info.name : undefined;
	if (!sub || !email) {
		return redirectLogin('google_failed');
	}

	const result = await registerOrLoginGoogleUser(sub, email, name);
	if (!result.ok) {
		return redirectLogin('google_failed');
	}

	const headers = new Headers();
	for (const c of clearOAuthCookieHeaders(request)) {
		headers.append('Set-Cookie', c);
	}
	headers.append('Set-Cookie', sessionCookieHeader(result.user, request));
	headers.set('Cache-Control', 'no-store');
	void appendUserActivity(result.user.id, 'login');

	const target = new URL(next, origin);
	target.searchParams.set('signed_in', '1');
	headers.set('Location', target.toString());
	return new Response(null, { status: 303, headers });
};
