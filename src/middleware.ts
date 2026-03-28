import { defineMiddleware } from 'astro:middleware';
import { userFromRequest, seedAdminIfEmpty } from './lib/auth';
import { serveUserUploadIfPresent } from './lib/serve-user-upload';

const CANONICAL_SITE_HOST = 'travelguide.ge';

function requestHost(request: Request): string | null {
	const raw =
		request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
		request.headers.get('host')?.split(',')[0]?.trim();
	return raw ? raw.toLowerCase() : null;
}

/** www and apex are different cookie jars — always use one public host (matches astro.config site). */
function redirectToCanonicalSiteHost(request: Request): Response | null {
	const host = requestHost(request);
	if (!host || host === CANONICAL_SITE_HOST) return null;
	if (host !== `www.${CANONICAL_SITE_HOST}`) return null;
	const url = new URL(request.url);
	const target = `https://${CANONICAL_SITE_HOST}${url.pathname}${url.search}`;
	return Response.redirect(target, 308);
}

export const onRequest = defineMiddleware(async (context, next) => {
	const canon = redirectToCanonicalSiteHost(context.request);
	if (canon) return canon;

	const upload = await serveUserUploadIfPresent(context.request);
	if (upload) return upload;

	await seedAdminIfEmpty();
	context.locals.user = (await userFromRequest(context.request.headers.get('cookie'))) ?? undefined;

	const path = context.url.pathname.replace(/\/$/, '') || '/';

	/*
	 * Paths like `/admin` or `/admin/tours/new` are otherwise parsed as locale `admin`
	 * (invalid → MissingLocaleError). Prefix the default locale.
	 * Does not match `/administration` (requires `/` or end after `admin`).
	 */
	if (/^\/admin(?:\/|$)/.test(path)) {
		return context.redirect(`/en${path}${context.url.search}`, 302);
	}

	const adminMatch = path.match(/^\/(en|ka|ru)\/admin(?:\/.*)?$/);
	if (adminMatch) {
		const user = context.locals.user;
		const loc = adminMatch[1];
		if (!user || user.role !== 'admin') {
			const login = new URL(`/${loc}/login`, context.url);
			login.searchParams.set('next', `/${loc}/admin`);
			return Response.redirect(login, 302);
		}
	}

	const accountMatch = path.match(/^\/(en|ka|ru)\/account(?:\/.*)?$/);
	if (accountMatch) {
		const user = context.locals.user;
		const loc = accountMatch[1];
		if (!user) {
			const login = new URL(`/${loc}/login`, context.url);
			login.searchParams.set('next', path + context.url.search);
			return Response.redirect(login, 302);
		}
	}

	const response = await next();
	/*
	 * Proxies/CDNs must not serve one cached HTML shell to users with different cookies, or auth
	 * looks random ("sometimes signed out", login appears to do nothing).
	 */
	const ct = response.headers.get('content-type') || '';
	if (ct.includes('text/html')) {
		response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
		response.headers.set('Vary', 'Cookie');
	}
	return response;
});
